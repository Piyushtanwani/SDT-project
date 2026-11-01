package com.elearning.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.ExamAttempt;
import com.elearning.models.User;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.ApiResponse;
import com.elearning.response_request.ExamAttemptSummary;
import com.elearning.response_request.ExamAutosaveRequest;
import com.elearning.response_request.ExamEventsResponse;
import com.elearning.response_request.ExamRulesView;
import com.elearning.response_request.ExamStartResponse;
import com.elearning.response_request.ExamSubmitRequest;
import com.elearning.response_request.ProctorEventBatchRequest;
import com.elearning.response_request.SnapshotRequest;
import com.elearning.services.CertificateService;
import com.elearning.services.ExamIntegrityService;
import com.elearning.services.ExamPolicy;
import com.elearning.services.ExamProctorService;
import com.elearning.services.ExamSessionService;
import com.elearning.services.RequestThrottle;

import jakarta.servlet.http.HttpServletRequest;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * The candidate's side of a proctored exam.
 *
 * Identity always comes from the verified bearer token, never from the body: a candidate cannot
 * start, resume, save or submit onto someone else's attempt, and cannot claim an attempt they did
 * not sit. Time, question set and score are all decided by {@link ExamSessionService}.
 */
@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private static final Duration THROTTLE_WINDOW = Duration.ofMinutes(1);

    private final ExamSessionService sessionService;
    private final ExamProctorService proctorService;
    private final ExamIntegrityService integrityService;
    private final ExamAttemptRepository attemptRepository;
    private final ExamPolicy policy;
    private final UserRepository userRepository;
    private final RequestThrottle throttle;

    public ExamController(ExamSessionService sessionService,
                          ExamProctorService proctorService,
                          ExamIntegrityService integrityService,
                          ExamAttemptRepository attemptRepository,
                          ExamPolicy policy,
                          UserRepository userRepository,
                          RequestThrottle throttle) {
        this.sessionService = sessionService;
        this.proctorService = proctorService;
        this.integrityService = integrityService;
        this.attemptRepository = attemptRepository;
        this.policy = policy;
        this.userRepository = userRepository;
        this.throttle = throttle;
    }

    @GetMapping("/course/{courseId}/rules")
    public ResponseEntity<?> rules(@PathVariable Long courseId,
                                  @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        ExamSessionService.Standing standing = sessionService.standing(caller.getId(), courseId);
        return ResponseEntity.ok(ExamRulesView.of(
                new ExamRulesView.ExamPolicyView(ExamPolicy.QUESTIONS_PER_EXAM, policy.durationMinutes(),
                        (int) CertificateService.PASSING_SCORE, policy.maxAttempts(), policy.cooldown().toHours(),
                        policy.maxFullscreenBlockSeconds(), policy.fullscreenRequired()),
                new ExamRulesView.StandingView(standing.attemptsUsed(), standing.attemptsRemaining(),
                        standing.nextAllowedAt())));
    }

    @PostMapping("/course/{courseId}/start")
    public ResponseEntity<?> start(@PathVariable Long courseId,
                                   @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                   HttpServletRequest request,
                                   @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        if (!throttle.tryAcquire("exam-start:" + caller.getId(), 20, THROTTLE_WINDOW)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ApiResponse(false, "Too many exam requests at once. Wait a moment and try again."));
        }
        ExamSessionService.OpenSitting sitting = sessionService.start(caller.getId(), courseId, userAgent,
                clientAddress(request));
        ExamAttempt attempt = sitting.attempt();
        int durationSeconds = attempt.getDeadline() == null || attempt.getStartedAt() == null
                ? (int) policy.duration().toSeconds()
                : (int) Duration.between(attempt.getStartedAt(), attempt.getDeadline()).getSeconds();
        return ResponseEntity.ok(new ExamStartResponse(
                attempt.getId(),
                sitting.drawToken(),
                sitting.questions(),
                sitting.questions().size(),
                attempt.getStartedAt(),
                attempt.getDeadline(),
                LocalDateTime.now(),
                durationSeconds,
                policy.minDurationSeconds(),
                policy.maxFullscreenBlockSeconds(),
                policy.fullscreenRequired(),
                attempt.getAttemptNumber()));
    }

    @PostMapping("/{attemptId}/autosave")
    public ResponseEntity<?> autosave(@PathVariable Long attemptId,
                                      @RequestBody ExamAutosaveRequest request,
                                      @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        sessionService.autosave(attemptId, caller.getId(), request.getAnswers());
        return ResponseEntity.ok(new ApiResponse(true, "Saved."));
    }

    /**
     * Ingests the signals the browser observed. A candidate can stay quiet here, but everything
     * they do say is stored with the server's own weight, label and timestamp.
     */
    @PostMapping("/{attemptId}/events")
    public ResponseEntity<?> events(@PathVariable Long attemptId,
                                    @RequestBody ProctorEventBatchRequest request,
                                    @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        if (!throttle.tryAcquire("exam-events:" + caller.getId(), 120, THROTTLE_WINDOW)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(new ApiResponse(false, "Slow down."));
        }
        ExamAttempt attempt = sessionService.ownedAttempt(attemptId, caller.getId());
        if (!attempt.isOpen()) {
            return ResponseEntity.ok(new ApiResponse(true, "Attempt closed."));
        }
        ExamProctorService.IngestResult result = proctorService.record(attempt, request.getEvents(), userAgent,
                request.getBrowserTabId());
        attemptRepository.save(attempt);
        if (result.fullscreenBreach()) {
            // The paper has been covered for longer than one sitting is given, so the clock stops
            // here on the server's decision rather than waiting for the candidate's page to agree.
            ExamAttempt closed = sessionService.closeFullscreenBreach(attempt);
            return ResponseEntity.ok(new ExamEventsResponse(true,
                    "Full screen was lost for " + closed.getFullscreenBlockedSeconds()
                            + "s, which is more than one sitting is given. This attempt is closed and graded"
                            + " from the answers we hold.",
                    true, closed.getStatus(), closed.getFullscreenBlockedSeconds()));
        }
        return ResponseEntity.ok(ExamEventsResponse.recorded(result.recorded(), attempt.getFullscreenBlockedSeconds()));
    }

    @PostMapping("/{attemptId}/snapshot")
    public ResponseEntity<?> snapshot(@PathVariable Long attemptId,
                                      @RequestBody SnapshotRequest request,
                                      @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        if (!throttle.tryAcquire("exam-snapshot:" + caller.getId(), 30, THROTTLE_WINDOW)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(new ApiResponse(false, "Slow down."));
        }
        ExamAttempt attempt = sessionService.ownedAttempt(attemptId, caller.getId());
        if (!attempt.isOpen()) {
            return ResponseEntity.ok(new ApiResponse(true, "Attempt closed."));
        }
        boolean stored = proctorService.storeSnapshot(attempt, request.label(), request.imageDataUrl());
        return ResponseEntity.ok(new ApiResponse(stored, stored ? "Frame stored." : "Frame not stored."));
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submitExam(@RequestBody ExamSubmitRequest request,
                                        @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        if (request.getAttemptId() == null) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, "Start the exam before submitting it."));
        }
        ExamAttempt attempt = sessionService.submit(request.getAttemptId(), caller.getId(),
                request.getDrawToken(), request.getAnswers());
        return ResponseEntity.ok(ExamAttemptSummary.of(attempt));
    }

    @GetMapping("/result/{attemptId}")
    public ResponseEntity<?> getExamResult(@PathVariable Long attemptId,
                                           @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        return attemptRepository.findById(attemptId)
                .map(attempt -> {
                    if (!caller.getId().equals(attempt.getUserId()) && !isAdmin(caller)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body((Object) new ApiResponse(false, "Cannot read another user's result."));
                    }
                    return ResponseEntity.ok((Object) ExamAttemptSummary.of(attempt));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** The candidate's own integrity record, shown exactly as the reviewer sees it. */
    @GetMapping("/{attemptId}/timeline")
    public ResponseEntity<?> timeline(@PathVariable Long attemptId,
                                      @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        ExamAttempt attempt = sessionService.ownedAttempt(attemptId, caller.getId());
        return ResponseEntity.ok(proctorService.timeline(attempt.getId()));
    }

    /**
     * The report this sitting earned, in the server's own words.
     *
     * The candidate reads the same document an invigilator reads, minus the email address and the
     * camera frames, so nobody has to wonder what the reviewer was shown.
     */
    @GetMapping("/{attemptId}/report")
    public ResponseEntity<?> report(@PathVariable Long attemptId,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        sessionService.ownedAttempt(attemptId, caller.getId());
        return ResponseEntity.ok(integrityService.report(attemptId, false));
    }

    private boolean isAdmin(User caller) {
        return "ADMIN".equalsIgnoreCase(caller.getRole());
    }

    private User caller(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }

    /**
     * The address the sitting came from, as our proxy reported it.
     *
     * nginx appends the real peer to {@code X-Forwarded-For}, so the last entry is the one a client
     * could not have written. This lands on the attempt as context for a reviewer, never as a fault:
     * a household and an office both arrive from one address.
     */
    private static String clientAddress(HttpServletRequest request) {
        String chain = request.getHeader("X-Forwarded-For");
        if (chain != null && !chain.isBlank()) {
            String[] parts = chain.split(",");
            String last = parts[parts.length - 1].trim();
            if (!last.isEmpty()) {
                return last;
            }
        }
        return request.getRemoteAddr();
    }

    private ResponseEntity<ApiResponse> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse(false, "Authentication required."));
    }
}

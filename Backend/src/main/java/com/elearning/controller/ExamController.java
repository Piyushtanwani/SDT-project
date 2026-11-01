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
import com.elearning.response_request.ExamRulesView;
import com.elearning.response_request.ExamStartResponse;
import com.elearning.response_request.ExamSubmitRequest;
import com.elearning.response_request.ProctorEventBatchRequest;
import com.elearning.response_request.SnapshotRequest;
import com.elearning.services.CertificateService;
import com.elearning.services.ExamPolicy;
import com.elearning.services.ExamProctorService;
import com.elearning.services.ExamSessionService;
import com.elearning.services.RequestThrottle;

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
    private final ExamAttemptRepository attemptRepository;
    private final ExamPolicy policy;
    private final UserRepository userRepository;
    private final RequestThrottle throttle;

    public ExamController(ExamSessionService sessionService,
                          ExamProctorService proctorService,
                          ExamAttemptRepository attemptRepository,
                          ExamPolicy policy,
                          UserRepository userRepository,
                          RequestThrottle throttle) {
        this.sessionService = sessionService;
        this.proctorService = proctorService;
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
                        (int) CertificateService.PASSING_SCORE, policy.maxAttempts(), policy.cooldown().toHours()),
                new ExamRulesView.StandingView(standing.attemptsUsed(), standing.attemptsRemaining(),
                        standing.nextAllowedAt())));
    }

    @PostMapping("/course/{courseId}/start")
    public ResponseEntity<?> start(@PathVariable Long courseId,
                                   @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                   @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        if (!throttle.tryAcquire("exam-start:" + caller.getId(), 20, THROTTLE_WINDOW)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ApiResponse(false, "Too many exam requests at once. Wait a moment and try again."));
        }
        ExamSessionService.OpenSitting sitting = sessionService.start(caller.getId(), courseId, userAgent);
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
        ExamProctorService.IngestResult result = proctorService.record(attempt, request.getEvents(), userAgent);
        attemptRepository.save(attempt);
        return ResponseEntity.ok(new ApiResponse(true, "Recorded " + result.recorded() + " signals."));
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

    private boolean isAdmin(User caller) {
        return "ADMIN".equalsIgnoreCase(caller.getRole());
    }

    private User caller(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }

    private ResponseEntity<ApiResponse> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse(false, "Authentication required."));
    }
}

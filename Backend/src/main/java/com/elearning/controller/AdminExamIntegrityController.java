package com.elearning.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.ApiResponse;
import com.elearning.response_request.IntegrityOverview;
import com.elearning.response_request.IntegrityReviewRequest;
import com.elearning.response_request.IntegrityRow;
import com.elearning.services.ExamIntegrityService;

import java.util.List;

/**
 * The invigilator's console.
 *
 * Mapped under {@code /api/admin/**}, which Spring Security already requires ROLE_ADMIN for, and
 * the caller's own id is taken from the verified token so every decision written here is
 * attributable to a real account rather than to whatever id a request body claimed.
 */
@RestController
@RequestMapping("/api/admin/exam-integrity")
public class AdminExamIntegrityController {

    private final ExamIntegrityService integrityService;
    private final UserRepository userRepository;

    public AdminExamIntegrityController(ExamIntegrityService integrityService, UserRepository userRepository) {
        this.integrityService = integrityService;
        this.userRepository = userRepository;
    }

    @GetMapping("/overview")
    public ResponseEntity<?> overview(@AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        IntegrityOverview overview = integrityService.overview();
        return ResponseEntity.ok(overview);
    }

    @GetMapping("/attempts")
    public ResponseEntity<?> attempts(@RequestParam(required = false) String integrity,
                                      @RequestParam(required = false) Long courseId,
                                      @RequestParam(required = false) Long userId,
                                      @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        List<IntegrityRow> rows = integrityService.list(integrity, courseId, userId);
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/attempts/{attemptId}")
    public ResponseEntity<?> attempt(@PathVariable Long attemptId,
                                     @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        return ResponseEntity.ok(integrityService.detail(attemptId));
    }

    /**
     * The report one sitting earns, with the camera frames attached.
     *
     * This is the document an invigilator quotes from, so it is the same one the candidate can read
     * at their own result page — plus the frames, which only a reviewer is shown.
     */
    @GetMapping("/attempts/{attemptId}/report")
    public ResponseEntity<?> report(@PathVariable Long attemptId,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        return ResponseEntity.ok(integrityService.report(attemptId, true));
    }

    @PostMapping("/attempts/{attemptId}/review")
    public ResponseEntity<?> review(@PathVariable Long attemptId,
                                    @RequestBody IntegrityReviewRequest request,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        return ResponseEntity.ok(integrityService.review(attemptId, caller.getId(),
                request.verdict(), request.note()));
    }

    /**
     * Throws a result out. Kept separate from a verdict change because the consequences differ:
     * a verdict of FLAGGED still leaves the score on the record, voiding removes the attempt's
     * power to carry a credential.
     */
    @PostMapping("/attempts/{attemptId}/void")
    public ResponseEntity<?> voidAttempt(@PathVariable Long attemptId,
                                         @RequestBody(required = false) IntegrityReviewRequest request,
                                         @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return unauthorized();
        }
        String note = request == null ? null : request.note();
        return ResponseEntity.ok(integrityService.voidAttempt(attemptId, caller.getId(), note));
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

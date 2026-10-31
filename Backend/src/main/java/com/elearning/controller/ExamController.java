package com.elearning.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.ExamAttempt;
import com.elearning.models.ExamQuestion;
import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.ApiResponse;
import com.elearning.response_request.ExamAttemptRequest;
import com.elearning.services.CertificateService;
import com.elearning.services.ExamAttemptService;
import com.elearning.services.ExamQuestionService;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamQuestionService examQuestionService;
    private final ExamAttemptService examAttemptService;
    private final UserRepository userRepository;

    public ExamController(
            ExamQuestionService examQuestionService,
            ExamAttemptService examAttemptService,
            UserRepository userRepository) {
        this.examQuestionService = examQuestionService;
        this.examAttemptService = examAttemptService;
        this.userRepository = userRepository;
    }

    @GetMapping("/course/{courseId}/random")
    public List<ExamQuestion> getRandomQuestions(@PathVariable Long courseId) {
        return examQuestionService.getRandomQuestions(courseId, 50);
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submitExam(@RequestBody ExamAttemptRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Authentication required to submit exam."));
        }

        User user = userRepository.findByEmail(auth.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Authenticated user not found."));
        }

        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !user.getId().equals(request.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, "Cannot submit exam on behalf of another user."));
        }

        double score = examQuestionService.evaluateExam(request.getCourseId(), request.getAnswers());
        if (!(score >= 0.0 && score <= 100.0)) {
            score = 0.0;
        }
        score = Math.round(score);
        boolean passed = score >= CertificateService.PASSING_SCORE;

        ExamAttempt attempt = new ExamAttempt(null, user.getId(), request.getCourseId(), score, passed, LocalDateTime.now());
        ExamAttempt savedAttempt = examAttemptService.saveAttempt(attempt);

        return ResponseEntity.ok(savedAttempt);
    }

    @GetMapping("/result/{attemptId}")
    public ResponseEntity<?> getExamResult(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User caller = userDetails == null ? null : userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiResponse(false, "Authentication required."));
        }
        return examAttemptService.getAttemptById(attemptId)
                .map(attempt -> {
                    boolean isAdmin = "ADMIN".equalsIgnoreCase(caller.getRole());
                    if (!isAdmin && !caller.getId().equals(attempt.getUserId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body((Object) new ApiResponse(false, "Cannot read another user's result."));
                    }
                    return ResponseEntity.ok((Object) attempt);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}


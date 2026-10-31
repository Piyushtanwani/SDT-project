package com.elearning.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.ExamAttempt;
import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import com.elearning.services.ExamAttemptService;

@RestController
@RequestMapping("/api/attempts")
public class ExamAttemptController {

    private final ExamAttemptService examAttemptService;
    private final UserRepository userRepository;

    public ExamAttemptController(ExamAttemptService examAttemptService, UserRepository userRepository) {
        this.examAttemptService = examAttemptService;
        this.userRepository = userRepository;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getAttemptsByUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User caller = caller(userDetails);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }
        boolean isAdmin = "ADMIN".equalsIgnoreCase(caller.getRole());
        if (!isAdmin && !userId.equals(caller.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Cannot read another user's attempts");
        }
        List<ExamAttempt> attempts = examAttemptService.getAttemptsByUser(userId);
        return ResponseEntity.ok(attempts);
    }

    private User caller(UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }
}

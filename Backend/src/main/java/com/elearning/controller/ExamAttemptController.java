package com.elearning.controller;

import org.springframework.web.bind.annotation.*;

import com.elearning.models.ExamAttempt;
import com.elearning.services.ExamAttemptService;

import java.util.List;

@RestController
@RequestMapping("/api/attempts")
public class ExamAttemptController {

    private final ExamAttemptService examAttemptService;

    public ExamAttemptController(ExamAttemptService examAttemptService) {
        this.examAttemptService = examAttemptService;
    }

    @GetMapping("/user/{userId}")
    public List<ExamAttempt> getAttemptsByUser(@PathVariable Long userId) {
        return examAttemptService.getAttemptsByUser(userId);
    }


    @PostMapping
    public ExamAttempt saveAttempt(@RequestBody ExamAttempt attempt) {
        return examAttemptService.saveAttempt(attempt);
    }
}

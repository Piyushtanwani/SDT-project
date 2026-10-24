package com.elearning.controller;

import org.springframework.web.bind.annotation.*;

import com.elearning.models.ExamAttempt;
import com.elearning.models.ExamQuestion;
import com.elearning.response_request.ExamAttemptRequest;
import com.elearning.services.ExamAttemptService;
import com.elearning.services.ExamQuestionService;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamQuestionService examQuestionService;
    private final ExamAttemptService examAttemptService;

    public ExamController(ExamQuestionService examQuestionService, ExamAttemptService examAttemptService) {
        this.examQuestionService = examQuestionService;
        this.examAttemptService = examAttemptService;
    }

    @GetMapping("/course/{courseId}/random")
    public List<ExamQuestion> getRandomQuestions(@PathVariable Long courseId) {
        return examQuestionService.getRandomQuestions(courseId, 50);
    }

    @PostMapping("/submit")
    public ExamAttempt submitExam(@RequestBody ExamAttemptRequest request) {
        double score = examQuestionService.evaluateExam(request.getAnswers());
        boolean passed = score >= 80; // Example passing criteria
        if(!(score>=0 && score<=100)) {
        	score=0;
        }
        score=Math.round(score);
        ExamAttempt attempt = new ExamAttempt(null, request.getUserId(), request.getCourseId(), score, passed, LocalDateTime.now());
        ExamAttempt savedAttempt = examAttemptService.saveAttempt(attempt);
        
        return savedAttempt; // Return the saved attempt with ID
    }

    @GetMapping("/result/{attemptId}")
    public ExamAttempt getExamResult(@PathVariable Long attemptId) {
        return examAttemptService.getAttemptById(attemptId).orElse(null);
    }
}


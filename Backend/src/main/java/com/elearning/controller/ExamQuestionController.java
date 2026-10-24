package com.elearning.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.ExamQuestion;
import com.elearning.response_request.ExamQuestionRequest;
import com.elearning.services.ExamQuestionService;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
public class ExamQuestionController {

    private final ExamQuestionService examQuestionService;

    public ExamQuestionController(ExamQuestionService examQuestionService) {
        this.examQuestionService = examQuestionService;
    }

    @GetMapping("/course/{courseId}")
    public List<ExamQuestion> getQuestions(@PathVariable Long courseId) {
        return examQuestionService.getQuestionsByCourse(courseId);
    }

    @PostMapping
    public ResponseEntity<String> addQuestion(@RequestBody ExamQuestionRequest request) {
        examQuestionService.addQuestions(request.getQuestions());
        return ResponseEntity.status(HttpStatus.OK).body("Successfully added Questions");
    }

}


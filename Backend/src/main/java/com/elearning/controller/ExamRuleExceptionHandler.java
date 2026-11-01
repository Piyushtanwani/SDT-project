package com.elearning.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.elearning.response_request.ApiResponse;
import com.elearning.services.ExamRuleException;

/**
 * Maps a refused exam request onto a status the browser can act on.
 *
 * 409 means the question set is gone and only a fresh Start fixes it; 403 means the candidate's own
 * standing is the problem, so retrying is pointless. TakeExam keys its messaging off that split.
 */
@RestControllerAdvice(assignableTypes = {ExamController.class, ExamAttemptController.class,
        AdminExamIntegrityController.class})
public class ExamRuleExceptionHandler {

    @ExceptionHandler(ExamRuleException.class)
    public ResponseEntity<ApiResponse> handle(ExamRuleException e) {
        HttpStatus status = switch (e.kind()) {
            case STALE -> HttpStatus.CONFLICT;
            case POLICY, DENIED -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
        };
        return ResponseEntity.status(status).body(new ApiResponse(false, e.getMessage()));
    }
}

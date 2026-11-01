package com.elearning.response_request;

import com.elearning.models.ExamQuestion;

import java.time.Instant;
import java.util.List;

/**
 * One exam attempt's served question set plus the signed token that must come back on submit.
 */
public record ExamDrawResponse(List<ExamQuestion> questions,
                               String drawToken,
                               int questionCount,
                               Instant expiresAt) {
}

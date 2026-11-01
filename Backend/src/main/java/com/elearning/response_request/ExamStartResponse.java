package com.elearning.response_request;

import com.elearning.models.ExamQuestion;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Returned when a candidate presses Start: the server has stamped the deadline and is holding the
 * clock, and the questions only reach the browser at this point so nothing can be read while the
 * timer is not running.
 */
public record ExamStartResponse(Long attemptId,
                                String drawToken,
                                List<ExamQuestion> questions,
                                int questionCount,
                                LocalDateTime startedAt,
                                LocalDateTime deadline,
                                LocalDateTime serverNow,
                                int durationSeconds,
                                int minDurationSeconds,
                                Integer attemptNumber) {
}

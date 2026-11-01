package com.elearning.response_request;

import com.elearning.models.ExamAttempt;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * An attempt as it may leave the server.
 *
 * The stored answer sheet, the served question ids and the per-attempt option orders stay in the
 * row: they are the keys to grading and, on a shared account, one learner's view of another's sheet
 * would be exactly the leak that matters.
 */
public record ExamAttemptSummary(Long id,
                                 Long userId,
                                 Long courseId,
                                 double score,
                                 boolean passed,
                                 String status,
                                 String integrity,
                                 int violationCount,
                                 int violationPoints,
                                 Integer totalQuestions,
                                 Integer correctCount,
                                 Integer attemptNumber,
                                 Long durationSeconds,
                                 LocalDateTime attemptedAt,
                                 LocalDateTime startedAt,
                                 LocalDateTime deadline,
                                 LocalDateTime submittedAt,
                                 String reviewNote,
                                 LocalDateTime reviewedAt,
                                 boolean autoGraded) {

    public static ExamAttemptSummary of(ExamAttempt attempt) {
        LocalDateTime closed = attempt.getSubmittedAt() != null ? attempt.getSubmittedAt() : attempt.getAttemptedAt();
        Long seconds = attempt.getStartedAt() != null && closed != null
                ? Math.max(0, Duration.between(attempt.getStartedAt(), closed).getSeconds())
                : null;
        return new ExamAttemptSummary(
                attempt.getId(),
                attempt.getUserId(),
                attempt.getCourseId(),
                attempt.getScore(),
                attempt.isPassed(),
                attempt.getStatus(),
                attempt.getIntegrity(),
                attempt.getViolationCount(),
                attempt.getViolationPoints(),
                attempt.getTotalQuestions(),
                attempt.getCorrectCount(),
                attempt.getAttemptNumber(),
                seconds,
                attempt.getAttemptedAt(),
                attempt.getStartedAt(),
                attempt.getDeadline(),
                attempt.getSubmittedAt(),
                // A verdict a reviewer reached is shown to the candidate with the reason they gave,
                // so the result page cannot quietly change under someone without them reading it.
                attempt.getReviewNote(),
                attempt.getReviewedAt(),
                ExamAttempt.STATUS_EXPIRED.equals(attempt.getStatus()));
    }
}

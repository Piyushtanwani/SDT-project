package com.elearning.response_request;

import java.time.LocalDateTime;

/** One row of the integrity queue. Names come from the server, so a candidate cannot relabel a record. */
public record IntegrityRow(Long attemptId,
                           Long userId,
                           String userName,
                           String userEmail,
                           Long courseId,
                           String courseName,
                           double score,
                           boolean passed,
                           String status,
                           String integrity,
                           int violationCount,
                           int violationPoints,
                           int eventCount,
                           int snapshotCount,
                           Integer attemptNumber,
                           Integer totalQuestions,
                           Integer correctCount,
                           Long durationSeconds,
                           LocalDateTime startedAt,
                           LocalDateTime deadline,
                           LocalDateTime submittedAt,
                           String reviewNote,
                           String reviewedBy,
                           LocalDateTime reviewedAt) {
}

package com.elearning.response_request;

import java.util.List;

/**
 * An attempt as a reviewer sees it: the summary the candidate can also read, plus the identity the
 * candidate cannot change and the notes only an admin writes.
 */
public record IntegrityAttemptView(Long id,
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
                                   Integer totalQuestions,
                                   Integer correctCount,
                                   Integer attemptNumber,
                                   Long durationSeconds,
                                   String userAgent,
                                   String reviewNote,
                                   String reviewedBy,
                                   java.time.LocalDateTime reviewedAt,
                                   java.time.LocalDateTime attemptedAt,
                                   java.time.LocalDateTime startedAt,
                                   java.time.LocalDateTime deadline,
                                   java.time.LocalDateTime submittedAt,
                                   List<ProctorEventView> events,
                                   List<SnapshotView> snapshots,
                                   boolean certificateIssued) {
}

package com.elearning.response_request;

import com.elearning.models.Certificate;
import com.elearning.models.ExamAttempt;

import java.time.LocalDateTime;

/**
 * One credential a learner holds, with the invigilation of the sitting that earned it.
 *
 * The raw {@link Certificate} entity used to be handed to the browser whole. This says the same
 * thing with the fields a learner is entitled to see, and adds the part that matters to them:
 * whether the attempt behind the paper was watched cleanly, flagged, or cleared by a reviewer.
 */
public record UserCertificateView(Long id,
                                  Long courseId,
                                  Long attemptId,
                                  double score,
                                  LocalDateTime issuedAt,
                                  String credentialId,
                                  String status,
                                  LocalDateTime withdrawnAt,
                                  String withdrawalReason,
                                  String integrity,
                                  int violationPoints,
                                  int violationCount,
                                  boolean reviewed,
                                  String proctoringLine) {

    public static UserCertificateView of(Certificate certificate, ExamAttempt attempt) {
        return new UserCertificateView(
                certificate.getId(),
                certificate.getCourseId(),
                certificate.getAttemptId(),
                certificate.getScore(),
                certificate.getIssuedAt(),
                certificate.getCredentialId(),
                certificate.getStatus(),
                certificate.getWithdrawnAt(),
                certificate.getWithdrawalReason(),
                attempt == null ? null : attempt.getIntegrity(),
                attempt == null ? 0 : attempt.getViolationPoints(),
                attempt == null ? 0 : attempt.getViolationCount(),
                attempt != null && attempt.getReviewedAt() != null,
                proctoringLine(attempt));
    }

    /**
     * The sentence printed on the certificate and read by anyone who verifies one.
     *
     * A credential earned on a sitting nobody could watch is not the same object as one earned in
     * clean full screen, and the difference has never been written down anywhere the learner could
     * see. This is that line, built only from what the server recorded.
     */
    public static String proctoringLine(ExamAttempt attempt) {
        if (attempt == null) {
            return "Proctored sitting — recorded before invigilation was kept on this attempt.";
        }
        boolean reviewed = attempt.getReviewedAt() != null;
        if (ExamAttempt.STATUS_VOIDED.equals(attempt.getStatus())) {
            return "Proctored sitting — voided by an invigilator, so this result does not stand.";
        }
        if (ExamAttempt.INTEGRITY_FLAGGED.equalsIgnoreCase(attempt.getIntegrity())) {
            return "Proctored sitting — held for invigilator review after " + attempt.getViolationCount()
                    + " recorded signal(s) worth " + attempt.getViolationPoints() + " points.";
        }
        if (ExamAttempt.INTEGRITY_REVIEW.equalsIgnoreCase(attempt.getIntegrity())) {
            return reviewed
                    ? "Proctored sitting — an invigilator read " + attempt.getViolationCount()
                            + " signal(s) and left it noted for attention."
                    : "Proctored sitting — " + attempt.getViolationCount() + " signal(s) worth "
                            + attempt.getViolationPoints() + " points, waiting on an invigilator.";
        }
        return reviewed
                ? "Proctored sitting — cleared by an invigilator after " + attempt.getViolationCount()
                        + " recorded signal(s)."
                : "Proctored sitting — " + (attempt.getViolationCount() == 0
                        ? "no interference recorded."
                        : attempt.getViolationCount() + " signal(s) recorded, under the review line.");
    }
}

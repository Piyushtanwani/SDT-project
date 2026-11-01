package com.elearning.response_request;

import java.time.LocalDateTime;
import java.util.List;

/**
 * The report one sitting earns: what happened, what it weighs, and what it means.
 *
 * Every number here is computed by the server from the rows it holds, which is why the candidate's
 * result page and the invigilator's console can show the same document without either of them
 * trusting the browser. Nothing in it is the candidate's assertion and nothing is the reviewer's
 * opinion — the opinion is {@link Review}, recorded separately with who wrote it.
 */
public record ExamIntegrityReport(Long attemptId,
                                  String candidateName,
                                  String candidateEmail,
                                  String courseName,
                                  Integer attemptNumber,
                                  String status,
                                  String verdict,
                                  String verdictMeaning,
                                  int riskScore,
                                  String riskBand,
                                  int signalCount,
                                  double score,
                                  Integer correctCount,
                                  Integer totalQuestions,
                                  boolean passed,
                                  LocalDateTime reportGeneratedAt,
                                  Worked worked,
                                  Device device,
                                  Camera camera,
                                  Review review,
                                  Certification certification,
                                  List<SignalGroup> groups,
                                  List<String> findings,
                                  List<ProctorEventView> events,
                                  List<SnapshotView> snapshots) {

    /** How the sitting was spent, on the server's clock. */
    public record Worked(LocalDateTime startedAt,
                         LocalDateTime deadline,
                         LocalDateTime submittedAt,
                         Long workedSeconds,
                         Long answeredCount,
                         Double secondsPerAnswer,
                         int coveredSeconds,
                         int coveredAllowanceSeconds,
                         int fullscreenExits) {
    }

    /** Where the traffic came from. Shared addresses are context, never an accusation. */
    public record Device(String userAgent, String clientIp, long otherAttemptsFromSameIp) {
    }

    /** ALLOWED, DECLINED or NEVER TURNED ON, plus how many frames actually landed. */
    public record Camera(String state, long frames) {
    }

    /** A human's decision, if one has been made yet. */
    public record Review(String verdict, String note, String reviewerName, LocalDateTime reviewedAt) {
    }

    /** Whether this sitting carried a credential, and if not, the reason a learner can read. */
    public record Certification(boolean issued, String credentialId, String notIssuedBecause) {
    }

    /** One kind of signal, counted. A reviewer reads groups before reading rows. */
    public record SignalGroup(String kind,
                              String label,
                              String severity,
                              int count,
                              int pointsEach,
                              int totalPoints,
                              boolean counted,
                              String lastDetail) {
    }
}

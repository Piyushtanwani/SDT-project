package com.elearning.services;

import com.elearning.models.Certificate;
import com.elearning.models.Course;
import com.elearning.models.ExamAttempt;
import com.elearning.models.User;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.repositories.ExamProctorEventRepository;
import com.elearning.repositories.ExamSnapshotRepository;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.ExamIntegrityReport;
import com.elearning.response_request.IntegrityAttemptView;
import com.elearning.response_request.IntegrityOverview;
import com.elearning.response_request.IntegrityRow;
import com.elearning.response_request.ProctorEventView;
import com.elearning.response_request.SnapshotView;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * What an invigilator sees and what an invigilator is allowed to change.
 *
 * The verdict an attempt carries is computed from the signals themselves, so a reviewer does not
 * have to read every timeline to find the queue; but only a reviewer can move it, and moving it
 * leaves its own entry on the timeline with who did it.
 */
@Service
public class ExamIntegrityService {

    private static final int PAGE_LIMIT = 50;

    private final ExamAttemptRepository attemptRepository;
    private final ExamProctorEventRepository eventRepository;
    private final ExamSnapshotRepository snapshotRepository;
    private final CertificateRepository certificateRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final ExamProctorService proctorService;
    private final CertificateService certificateService;
    private final ExamPolicy policy;
    private final ObjectMapper objectMapper;

    public ExamIntegrityService(ExamAttemptRepository attemptRepository,
                                ExamProctorEventRepository eventRepository,
                                ExamSnapshotRepository snapshotRepository,
                                CertificateRepository certificateRepository,
                                UserRepository userRepository,
                                CourseRepository courseRepository,
                                ExamProctorService proctorService,
                                CertificateService certificateService,
                                ExamPolicy policy,
                                ObjectMapper objectMapper) {
        this.attemptRepository = attemptRepository;
        this.eventRepository = eventRepository;
        this.snapshotRepository = snapshotRepository;
        this.certificateRepository = certificateRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.proctorService = proctorService;
        this.certificateService = certificateService;
        this.policy = policy;
        this.objectMapper = objectMapper;
    }

    public IntegrityOverview overview() {
        List<ExamAttempt> recent = attemptRepository.findTop50ByOrderByIdDesc();
        int inProgress = 0;
        int submitted = 0;
        int expired = 0;
        int flagged = 0;
        int review = 0;
        int voided = 0;
        int today = 0;
        LocalDate day = LocalDate.now();
        for (ExamAttempt attempt : recent) {
            switch (attempt.getStatus()) {
                case ExamAttempt.STATUS_IN_PROGRESS -> inProgress++;
                case ExamAttempt.STATUS_SUBMITTED -> submitted++;
                case ExamAttempt.STATUS_EXPIRED -> expired++;
                case ExamAttempt.STATUS_VOIDED -> voided++;
                default -> { }
            }
            if (ExamAttempt.INTEGRITY_FLAGGED.equalsIgnoreCase(attempt.getIntegrity())) {
                flagged++;
            } else if (ExamAttempt.INTEGRITY_REVIEW.equalsIgnoreCase(attempt.getIntegrity())) {
                review++;
            }
            if (attempt.getAttemptedAt() != null && attempt.getAttemptedAt().toLocalDate().equals(day)) {
                today++;
            }
        }
        List<IntegrityRow> queue = rows(attemptRepository.findAwaitingReview(PageRequest.of(0, PAGE_LIMIT)));
        return new IntegrityOverview(recent.size(), inProgress, submitted, expired, flagged, review, voided,
                today, queue);
    }

    /**
     * A filtered slice of the register.
     *
     * @param integrity CLEAN, REVIEW or FLAGGED; blank means every verdict
     */
    public List<IntegrityRow> list(String integrity, Long courseId, Long userId) {
        if (userId != null) {
            return rows(attemptRepository.findTop50ByUserIdOrderByIdDesc(userId));
        }
        if (courseId != null) {
            return rows(attemptRepository.findTop50ByCourseIdOrderByIdDesc(courseId));
        }
        if (integrity != null && !integrity.isBlank()) {
            String wanted = integrity.trim().toUpperCase(Locale.ROOT);
            if (wanted.equals(ExamAttempt.INTEGRITY_CLEAN)) {
                return rows(cleanRecent());
            }
            return rows(attemptRepository.findTop50ByIntegrityOrderByIdDesc(wanted));
        }
        return rows(attemptRepository.findTop50ByOrderByIdDesc());
    }

    public IntegrityAttemptView detail(Long attemptId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ExamRuleException(ExamRuleException.Kind.NOT_FOUND,
                        "That exam attempt no longer exists."));
        return view(attempt, true);
    }

    /**
     * A reviewer's verdict, kept alongside the signals it was reached from.
     *
     * @param verdict CLEAN clears an attempt, FLAGGED condemns it; both are written down with the
     *                reviewer so the decision is attributable later
     */
    @Transactional
    public IntegrityAttemptView review(Long attemptId, Long reviewerId, String verdict, String note) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ExamRuleException(ExamRuleException.Kind.NOT_FOUND,
                        "That exam attempt no longer exists."));
        String wanted = verdict == null ? "" : verdict.trim().toUpperCase(Locale.ROOT);
        if (!wanted.equals(ExamAttempt.INTEGRITY_CLEAN)
                && !wanted.equals(ExamAttempt.INTEGRITY_REVIEW)
                && !wanted.equals(ExamAttempt.INTEGRITY_FLAGGED)) {
            throw new ExamRuleException(ExamRuleException.Kind.POLICY,
                    "A verdict is CLEAN, REVIEW or FLAGGED.");
        }
        attempt.setIntegrity(wanted);
        attempt.setReviewNote(trim(note, 4000));
        attempt.setReviewedBy(reviewerId);
        attempt.setReviewedAt(LocalDateTime.now());
        attemptRepository.save(attempt);
        proctorService.recordServer(attempt, ProctorSignal.REVIEW_DECISION,
                reviewerName(reviewerId) + " set " + wanted);
        // A verdict only means something if the paper the attempt earned moves with it: clearing a
        // sitting hands its credential back, flagging one withdraws it.
        certificateService.syncCredentialsFor(attempt);
        return view(attemptRepository.save(attempt), true);
    }

    /**
     * Throws a result out without erasing it.
     *
     * The score stays on the record and the signals stay on the timeline; what changes is that the
     * attempt can no longer carry a credential, and it still cost the candidate one of their
     * sittings so voiding cannot be used to buy a free retake.
     */
    @Transactional
    public IntegrityAttemptView voidAttempt(Long attemptId, Long reviewerId, String note) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ExamRuleException(ExamRuleException.Kind.NOT_FOUND,
                        "That exam attempt no longer exists."));
        attempt.setStatus(ExamAttempt.STATUS_VOIDED);
        attempt.setIntegrity(ExamAttempt.INTEGRITY_FLAGGED);
        attempt.setReviewNote(trim(note, 4000));
        attempt.setReviewedBy(reviewerId);
        attempt.setReviewedAt(LocalDateTime.now());
        attemptRepository.save(attempt);
        proctorService.recordServer(attempt, ProctorSignal.VOIDED_BY_REVIEWER,
                "Voided by " + reviewerName(reviewerId));
        certificateService.syncCredentialsFor(attempt);
        return view(attemptRepository.save(attempt), true);
    }

    /** Everything the learner can see about their own attempt: the record, not the answer key. */
    public IntegrityAttemptView ownView(ExamAttempt attempt) {
        return view(attempt, false);
    }

    /**
     * The document one sitting earns, in the server's own words.
     *
     * @param includeImages whether to carry the camera frames; only a reviewer gets them, and a
     *                      learner's own page already renders them from the evidence list
     */
    public ExamIntegrityReport report(Long attemptId, boolean includeImages) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ExamRuleException(ExamRuleException.Kind.NOT_FOUND,
                        "That exam attempt no longer exists."));
        return report(attempt, includeImages);
    }

    private ExamIntegrityReport report(ExamAttempt attempt, boolean includeImages) {
        List<ProctorEventView> events = proctorService.timeline(attempt.getId());
        List<SnapshotView> snapshots = includeImages ? proctorService.snapshots(attempt.getId()) : List.of();
        Map<String, List<ProctorEventView>> byKind = new LinkedHashMap<>();
        for (ProctorEventView event : events) {
            byKind.computeIfAbsent(event.kind(), ignored -> new ArrayList<>()).add(event);
        }
        User user = userRepository.findById(attempt.getUserId()).orElse(null);
        String courseName = courseRepository.findById(attempt.getCourseId())
                .map(Course::getName).orElse("Unknown course");

        long frames = snapshotRepository.countByAttemptId(attempt.getId());
        ExamIntegrityReport.Camera camera = new ExamIntegrityReport.Camera(cameraState(byKind, frames), frames);
        Long worked = durationSeconds(attempt);
        Long answered = countAnswers(attempt.getAnswers());
        Double perAnswer = worked == null || answered == null || answered == 0
                ? null
                : Math.round(worked.doubleValue() / answered * 10) / 10.0;
        int exits = byKind.containsKey(ProctorSignal.FULLSCREEN_EXIT.name())
                ? byKind.get(ProctorSignal.FULLSCREEN_EXIT.name()).size() : 0;
        ExamIntegrityReport.Worked time = new ExamIntegrityReport.Worked(attempt.getStartedAt(),
                attempt.getDeadline(), attempt.getSubmittedAt(), worked, answered, perAnswer,
                attempt.getFullscreenBlockedSeconds(), policy.maxFullscreenBlockSeconds(), exits);
        long shared = attempt.getClientIp() == null ? 0
                : attemptRepository.findByClientIp(attempt.getClientIp()).stream()
                        .filter(other -> !other.getUserId().equals(attempt.getUserId()))
                        .count();
        ExamIntegrityReport.Device device = new ExamIntegrityReport.Device(attempt.getUserAgent(),
                attempt.getClientIp(), shared);
        ExamIntegrityReport.Review review = attempt.getReviewedAt() == null ? null
                : new ExamIntegrityReport.Review(attempt.getIntegrity(), attempt.getReviewNote(),
                        reviewerName(attempt.getReviewedBy()), attempt.getReviewedAt());
        ExamIntegrityReport.Certification certification = certificationOf(attempt);
        List<ExamIntegrityReport.SignalGroup> groups = groups(byKind);

        return new ExamIntegrityReport(
                attempt.getId(),
                user == null ? "Unknown learner" : user.getUsername(),
                includeImages ? (user == null ? null : user.getEmail()) : null,
                courseName,
                attempt.getAttemptNumber(),
                attempt.getStatus(),
                attempt.getIntegrity(),
                verdictMeaning(attempt.getIntegrity(), attempt.getReviewedAt() != null),
                attempt.getViolationPoints(),
                riskBand(attempt.getViolationPoints()),
                attempt.getViolationCount(),
                attempt.getScore(),
                attempt.getCorrectCount(),
                attempt.getTotalQuestions(),
                attempt.isPassed(),
                LocalDateTime.now(),
                time,
                device,
                camera,
                review,
                certification,
                groups,
                findings(attempt, time, device, camera, certification, review, groups, byKind),
                events,
                snapshots);
    }

    /** Signals of the same kind counted once, heaviest first, so a reviewer reads the shape before the rows. */
    private List<ExamIntegrityReport.SignalGroup> groups(Map<String, List<ProctorEventView>> byKind) {
        List<ExamIntegrityReport.SignalGroup> groups = new ArrayList<>();
        for (Map.Entry<String, List<ProctorEventView>> entry : byKind.entrySet()) {
            List<ProctorEventView> rows = entry.getValue();
            ProctorEventView last = rows.get(rows.size() - 1);
            int total = rows.stream().mapToInt(ProctorEventView::points).sum();
            groups.add(new ExamIntegrityReport.SignalGroup(entry.getKey(), last.label(), last.severity(),
                    rows.size(), last.points(), total, last.points() > 0, last.detail()));
        }
        groups.sort(Comparator.comparingInt(ExamIntegrityReport.SignalGroup::totalPoints).reversed()
                .thenComparing(ExamIntegrityReport.SignalGroup::label));
        return groups;
    }

    /**
     * Plain sentences about one sitting, built from the rows this server holds.
     *
     * A list of signals is not a report: what an invigilator needs is the shape of the sitting in
     * words they can read once and quote later. Each line is derived from stored facts, so the
     * candidate's own page cannot put anything into it that the database did not say.
     */
    private List<String> findings(ExamAttempt attempt,
                                  ExamIntegrityReport.Worked time,
                                  ExamIntegrityReport.Device device,
                                  ExamIntegrityReport.Camera camera,
                                  ExamIntegrityReport.Certification certification,
                                  ExamIntegrityReport.Review review,
                                  List<ExamIntegrityReport.SignalGroup> groups,
                                  Map<String, List<ProctorEventView>> byKind) {
        List<String> lines = new ArrayList<>();
        String outcome = switch (attempt.getStatus() == null ? ExamAttempt.STATUS_SUBMITTED : attempt.getStatus()) {
            case ExamAttempt.STATUS_VOIDED -> "A reviewer voided this result.";
            case ExamAttempt.STATUS_EXPIRED -> "Time ran out; the paper was graded from what had reached us.";
            case ExamAttempt.STATUS_IN_PROGRESS -> "This sitting is still running.";
            default -> "The candidate handed this paper in.";
        };
        lines.add(outcome + " " + scoreSentence(attempt));

        if (time.workedSeconds() != null) {
            lines.add("On the clock: " + humanDuration(time.workedSeconds()) + " of work"
                    + (time.answeredCount() == null ? "."
                    : ", " + time.answeredCount() + " questions answered"
                            + (time.secondsPerAnswer() == null
                                    ? "." : " (" + time.secondsPerAnswer() + "s per answer).")));
        }
        if (attempt.getFullscreenBlockedSeconds() > 0 || time.fullscreenExits() > 0) {
            lines.add("Full screen was lost " + time.fullscreenExits() + " time(s) and the paper stayed covered for "
                    + attempt.getFullscreenBlockedSeconds() + "s of the " + time.coveredAllowanceSeconds()
                    + "s one sitting is given.");
        } else if (ExamAttempt.STATUS_IN_PROGRESS.equals(attempt.getStatus())
                || ExamAttempt.STATUS_SUBMITTED.equals(attempt.getStatus())) {
            lines.add("Full screen was held for the whole sitting.");
        }

        addIfPresent(lines, byKind, ProctorSignal.TAB_HIDDEN, name ->
                name + " — the exam tab was in the background " + count(byKind, ProctorSignal.TAB_HIDDEN) + " time(s).");
        addIfPresent(lines, byKind, ProctorSignal.WINDOW_BLUR, name ->
                name + " — the window lost focus " + count(byKind, ProctorSignal.WINDOW_BLUR) + " time(s).");
        addWeighted(lines, byKind, ProctorSignal.COPY, "text was copied out of the exam");
        addWeighted(lines, byKind, ProctorSignal.CUT, "text was cut from the exam");
        addWeighted(lines, byKind, ProctorSignal.PASTE, "text was pasted into the exam");
        addWeighted(lines, byKind, ProctorSignal.PASTE_IMAGE, "a picture was pasted into the exam");
        addWeighted(lines, byKind, ProctorSignal.CONTEXT_MENU, "the browser menu was opened");
        addWeighted(lines, byKind, ProctorSignal.PRINT_SCREEN, "the screenshot key was pressed");
        addWeighted(lines, byKind, ProctorSignal.PRINT_OR_SAVE, "the paper was printed or saved");
        addWeighted(lines, byKind, ProctorSignal.DEVTOOLS_KEY, "a developer-tools shortcut was pressed");
        addWeighted(lines, byKind, ProctorSignal.DEVTOOLS_LAYOUT_HINT, "the window measured as if developer tools were open");
        addWeighted(lines, byKind, ProctorSignal.BEFORE_UNLOAD, "the page was closed or reloaded mid-sitting");
        addWeighted(lines, byKind, ProctorSignal.NAVIGATION_BLOCKED, "the page tried to navigate away mid-sitting");
        addWeighted(lines, byKind, ProctorSignal.FILE_DROPPED, "a file was dropped onto the exam");
        addWeighted(lines, byKind, ProctorSignal.SCREEN_SHARE_STARTED, "a screen share was started");
        addWeighted(lines, byKind, ProctorSignal.SELECT_ALL, "the whole page was selected");
        addWeighted(lines, byKind, ProctorSignal.NETWORK_OFFLINE, "the connection dropped");
        addWeighted(lines, byKind, ProctorSignal.WINDOW_MOVED, "the browser window was moved");
        addWeighted(lines, byKind, ProctorSignal.WINDOW_RESIZED, "the browser window was resized");
        addWeighted(lines, byKind, ProctorSignal.VIEWPORT_TOO_SMALL, "the exam was shown in a window too small to be a real sitting");
        addWeighted(lines, byKind, ProctorSignal.OFF_SCREEN_WINDOW, "the window sat partly off the screen");
        addWeighted(lines, byKind, ProctorSignal.ZOOM_CHANGED, "the browser zoom changed");
        addWeighted(lines, byKind, ProctorSignal.SYNTHETIC_EVENT, "a click or key press came from code, not a person");
        addWeighted(lines, byKind, ProctorSignal.AUTOMATION_DRIVER, "automation software was found in this browser");
        addWeighted(lines, byKind, ProctorSignal.EMBEDDED_IN_IFRAME, "the exam page was inside another page");
        addWeighted(lines, byKind, ProctorSignal.HEADLESS_BROWSER, "the traffic identified itself as not a browser");
        addWeighted(lines, byKind, ProctorSignal.SECOND_TAB_SAME_ATTEMPT, "a second browser tab held the same sitting");
        addWeighted(lines, byKind, ProctorSignal.HEARTBEAT_GAP, "the exam page went silent");
        addWeighted(lines, byKind, ProctorSignal.TOKEN_REPLAY, "a question set that had already been used was presented");
        addWeighted(lines, byKind, ProctorSignal.CLOCK_SKEW, "the browser clock disagreed with ours");
        addWeighted(lines, byKind, ProctorSignal.USER_AGENT_CHANGED, "the traffic changed browser mid-sitting");
        addWeighted(lines, byKind, ProctorSignal.EVENT_OVERFLOW, "the page reported more signals than one attempt can hold");

        lines.add(cameraStateSentence(camera));
        if (device.clientIp() != null) {
            lines.add("Reached us from " + device.clientIp()
                    + (device.otherAttemptsFromSameIp() > 0
                    ? ", an address " + device.otherAttemptsFromSameIp() + " other candidate(s) also sat from. "
                    + "Households share one address, so this is context, not a fault."
                    : "."));
        }
        addIfPresent(lines, byKind, ProctorSignal.SHARED_NETWORK_ADDRESS, name -> name
                + " — other attempts reached us from this address; a family sharing a connection looks like this.");
        addIfPresent(lines, byKind, ProctorSignal.ANSWERED_FASTER_THAN_READING, name ->
                name + " — " + detailOf(byKind, ProctorSignal.ANSWERED_FASTER_THAN_READING));
        addIfPresent(lines, byKind, ProctorSignal.SINGLE_LETTER_PATTERN, name ->
                name + " — " + detailOf(byKind, ProctorSignal.SINGLE_LETTER_PATTERN));

        if (review == null) {
            lines.add("No reviewer has read this attempt yet; "
                    + (ExamAttempt.INTEGRITY_FLAGGED.equals(attempt.getIntegrity())
                    ? "it is in the review queue." : "the weights alone decided its verdict."));
        } else {
            lines.add(reviewerName(attempt.getReviewedBy()) + " decided " + review.verdict()
                    + (review.note() == null ? ", with no note." : ": " + review.note()));
        }
        if (!certification.issued()) {
            lines.add("No certificate came from this attempt. " + certification.notIssuedBecause());
        } else {
            lines.add("This attempt carried certificate " + certification.credentialId() + ".");
        }
        return lines;
    }

    private List<ExamAttempt> cleanRecent() {
        List<ExamAttempt> clean = new ArrayList<>();
        for (ExamAttempt attempt : attemptRepository.findTop50ByOrderByIdDesc()) {
            if (ExamAttempt.INTEGRITY_CLEAN.equalsIgnoreCase(attempt.getIntegrity())) {
                clean.add(attempt);
            }
        }
        return clean;
    }

    /** A line only when the signal exists at all, so an honest sitting's report is not full of denials. */
    private static void addIfPresent(List<String> lines, Map<String, List<ProctorEventView>> byKind,
                                     ProctorSignal signal, java.util.function.Function<String, String> sentence) {
        List<ProctorEventView> rows = byKind.get(signal.name());
        if (rows != null && !rows.isEmpty()) {
            lines.add(sentence.apply(signal.label()));
        }
    }

    /** "Twice, worth 4 points: text was copied out of the exam." */
    private void addWeighted(List<String> lines, Map<String, List<ProctorEventView>> byKind,
                             ProctorSignal signal, String what) {
        List<ProctorEventView> rows = byKind.get(signal.name());
        if (rows == null || rows.isEmpty()) {
            return;
        }
        int points = rows.stream().mapToInt(ProctorEventView::points).sum();
        lines.add(what.substring(0, 1).toUpperCase(Locale.ROOT) + what.substring(1) + " "
                + rows.size() + " time(s), worth " + points + " point(s).");
    }

    private static int count(Map<String, List<ProctorEventView>> byKind, ProctorSignal signal) {
        List<ProctorEventView> rows = byKind.get(signal.name());
        return rows == null ? 0 : rows.size();
    }

    private static String detailOf(Map<String, List<ProctorEventView>> byKind, ProctorSignal signal) {
        List<ProctorEventView> rows = byKind.get(signal.name());
        if (rows == null || rows.isEmpty()) {
            return "";
        }
        String detail = rows.get(rows.size() - 1).detail();
        return detail == null ? signal.label() : detail;
    }

    /**
     * Whether the candidate ever let the camera run.
     *
     * Three states, because "no frames" means something different when a browser refused the prompt,
     * when the candidate pressed the button and it died, and when nobody ever touched it.
     */
    private static String cameraState(Map<String, List<ProctorEventView>> byKind, long frames) {
        if (frames > 0) {
            return "ALLOWED";
        }
        return byKind.containsKey(ProctorSignal.CAMERA_DENIED.name()) ? "DECLINED" : "NEVER TURNED ON";
    }

    private static String cameraStateSentence(ExamIntegrityReport.Camera camera) {
        return switch (camera.state()) {
            case "ALLOWED" -> "The camera was allowed and " + camera.frames() + " frame(s) are attached to this report.";
            case "DECLINED" -> "The candidate declined the camera, so there are no frames. That is a choice, not a fault.";
            default -> "The camera was never turned on during this sitting, so no frames exist.";
        };
    }

    private static String scoreSentence(ExamAttempt attempt) {
        if (attempt.getTotalQuestions() == null || attempt.getTotalQuestions() == 0) {
            return "No score was computed.";
        }
        return "Marked " + attempt.getCorrectCount() + " of " + attempt.getTotalQuestions()
                + " (" + (int) attempt.getScore() + "%), which "
                + (attempt.isPassed() ? "passes" : "does not pass") + " the "
                + (int) CertificateService.PASSING_SCORE + "% line.";
    }

    private static String humanDuration(Long seconds) {
        if (seconds == null) {
            return "an unknown time";
        }
        long minutes = seconds / 60;
        long rest = seconds % 60;
        return minutes == 0 ? rest + "s" : minutes + "m " + rest + "s";
    }

    private String riskBand(int points) {
        if (points >= policy.flagThreshold()) {
            return "HIGH";
        }
        return points >= policy.reviewThreshold() ? "MEDIUM" : "LOW";
    }

    private static String verdictMeaning(String integrity, boolean reviewed) {
        boolean flagged = ExamAttempt.INTEGRITY_FLAGGED.equalsIgnoreCase(integrity);
        if (flagged) {
            return reviewed ? "A reviewer left this attempt flagged."
                    : "The weights put this attempt past the line a human has to look at.";
        }
        if (ExamAttempt.INTEGRITY_REVIEW.equalsIgnoreCase(integrity)) {
            return reviewed ? "A reviewer set this to REVIEW."
                    : "Worth a look, but nothing that condemns the attempt on its own.";
        }
        return reviewed ? "A reviewer cleared this attempt."
                : "Nothing recorded here carries weight on its own.";
    }

    /**
     * Whether this sitting earned a credential and, when it did not, in words a learner can act on.
     *
     * The reason is read from the attempt rather than guessed, so a candidate is never told to wait
     * for a review that has already happened or cleared of a flag that is still on the row.
     */
    private ExamIntegrityReport.Certification certificationOf(ExamAttempt attempt) {
        Certificate certificate = certificateRepository.findByUserId(attempt.getUserId()).stream()
                .filter(cert -> attempt.getCourseId().equals(cert.getCourseId()))
                .filter(cert -> attempt.getId().equals(cert.getAttemptId()))
                .findFirst()
                .orElse(null);
        if (certificate != null) {
            if (Certificate.STATUS_REVOKED.equalsIgnoreCase(certificate.getStatus())) {
                return new ExamIntegrityReport.Certification(false, certificate.getCredentialId(),
                        certificate.getWithdrawalReason() == null
                                ? "The credential was withdrawn after this sitting."
                                : certificate.getWithdrawalReason());
            }
            return new ExamIntegrityReport.Certification(true, certificate.getCredentialId(), null);
        }
        if (ExamAttempt.STATUS_VOIDED.equals(attempt.getStatus())) {
            return new ExamIntegrityReport.Certification(false, null, "A reviewer voided this sitting.");
        }
        if (!attempt.isPassed() && attempt.getScore() < CertificateService.PASSING_SCORE) {
            return new ExamIntegrityReport.Certification(false, null,
                    "The paper scored under " + (int) CertificateService.PASSING_SCORE + "%.");
        }
        if (ExamAttempt.INTEGRITY_FLAGGED.equalsIgnoreCase(attempt.getIntegrity())) {
            return new ExamIntegrityReport.Certification(false, null,
                    "The attempt is still flagged, so a reviewer has to clear it before a certificate is issued.");
        }
        if (!ExamAttempt.STATUS_SUBMITTED.equals(attempt.getStatus())
                && !ExamAttempt.STATUS_EXPIRED.equals(attempt.getStatus())) {
            return new ExamIntegrityReport.Certification(false, null, "This sitting has not closed yet.");
        }
        return new ExamIntegrityReport.Certification(false, null,
                "Another attempt of this course carried the certificate instead.");
    }

    /** How many answers the server was last holding for this sitting. */
    private Long countAnswers(String json) {
        if (json == null || json.isBlank()) {
            return 0L;
        }
        try {
            Map<?, ?> parsed = objectMapper.readValue(json, Map.class);
            return (long) parsed.size();
        } catch (Exception unreadable) {
            return null;
        }
    }


    private List<IntegrityRow> rows(List<ExamAttempt> attempts) {
        Set<Long> ids = attemptIds(attempts);
        Map<Long, Integer> eventCounts = ids.isEmpty() ? Map.of() : groupedCounts(eventRepository.countGrouped(ids));
        Map<Long, Integer> snapshotCounts = ids.isEmpty() ? Map.of() : groupedCounts(snapshotRepository.countGrouped(ids));
        Map<Long, User> users = users(attempts);
        Map<Long, String> courseNames = courseNames(attempts);

        List<IntegrityRow> rows = new ArrayList<>(attempts.size());
        for (ExamAttempt attempt : attempts) {
            User user = users.get(attempt.getUserId());
            rows.add(new IntegrityRow(
                    attempt.getId(),
                    attempt.getUserId(),
                    user == null ? "Unknown learner" : user.getUsername(),
                    user == null ? null : user.getEmail(),
                    attempt.getCourseId(),
                    courseNames.getOrDefault(attempt.getCourseId(), "Unknown course"),
                    attempt.getScore(),
                    attempt.isPassed(),
                    attempt.getStatus(),
                    attempt.getIntegrity(),
                    attempt.getViolationCount(),
                    attempt.getViolationPoints(),
                    eventCounts.getOrDefault(attempt.getId(), 0),
                    snapshotCounts.getOrDefault(attempt.getId(), 0),
                    attempt.getAttemptNumber(),
                    attempt.getTotalQuestions(),
                    attempt.getCorrectCount(),
                    durationSeconds(attempt),
                    attempt.getStartedAt(),
                    attempt.getDeadline(),
                    attempt.getSubmittedAt(),
                    attempt.getReviewNote(),
                    reviewerName(attempt.getReviewedBy()),
                    attempt.getReviewedAt()));
        }
        return rows;
    }

    private IntegrityAttemptView view(ExamAttempt attempt, boolean includeImages) {
        User user = userRepository.findById(attempt.getUserId()).orElse(null);
        String courseName = courseRepository.findById(attempt.getCourseId())
                .map(Course::getName).orElse("Unknown course");
        boolean issued = certificateRepository.findByUserId(attempt.getUserId()).stream()
                .anyMatch(cert -> attempt.getCourseId().equals(cert.getCourseId()));
        return new IntegrityAttemptView(
                attempt.getId(),
                attempt.getUserId(),
                user == null ? "Unknown learner" : user.getUsername(),
                user == null ? null : user.getEmail(),
                attempt.getCourseId(),
                courseName,
                attempt.getScore(),
                attempt.isPassed(),
                attempt.getStatus(),
                attempt.getIntegrity(),
                attempt.getViolationCount(),
                attempt.getViolationPoints(),
                attempt.getTotalQuestions(),
                attempt.getCorrectCount(),
                attempt.getAttemptNumber(),
                durationSeconds(attempt),
                attempt.getUserAgent(),
                attempt.getReviewNote(),
                reviewerName(attempt.getReviewedBy()),
                attempt.getReviewedAt(),
                attempt.getAttemptedAt(),
                attempt.getStartedAt(),
                attempt.getDeadline(),
                attempt.getSubmittedAt(),
                proctorService.timeline(attempt.getId()),
                includeImages ? proctorService.snapshots(attempt.getId()) : List.of(),
                issued);
    }

    private static Long durationSeconds(ExamAttempt attempt) {
        if (attempt.getStartedAt() == null) {
            return null;
        }
        LocalDateTime closed = attempt.getSubmittedAt() != null ? attempt.getSubmittedAt() : LocalDateTime.now();
        return Math.max(0, Duration.between(attempt.getStartedAt(), closed).getSeconds());
    }

    private static Set<Long> attemptIds(Collection<ExamAttempt> attempts) {
        Set<Long> ids = new HashSet<>();
        for (ExamAttempt attempt : attempts) {
            if (attempt.getId() != null) {
                ids.add(attempt.getId());
            }
        }
        return ids;
    }

    private Map<Long, User> users(Collection<ExamAttempt> attempts) {
        Set<Long> ids = new HashSet<>();
        for (ExamAttempt attempt : attempts) {
            if (attempt.getUserId() != null) {
                ids.add(attempt.getUserId());
            }
        }
        Map<Long, User> byId = new HashMap<>();
        if (!ids.isEmpty()) {
            userRepository.findAllById(ids).forEach(user -> byId.put(user.getId(), user));
        }
        return byId;
    }

    private Map<Long, String> courseNames(Collection<ExamAttempt> attempts) {
        Set<Long> ids = new HashSet<>();
        for (ExamAttempt attempt : attempts) {
            if (attempt.getCourseId() != null) {
                ids.add(attempt.getCourseId());
            }
        }
        Map<Long, String> names = new HashMap<>();
        if (!ids.isEmpty()) {
            courseRepository.findAllById(ids).forEach(course -> names.put(course.getId(), course.getName()));
        }
        return names;
    }

    private static Map<Long, Integer> groupedCounts(List<Object[]> grouped) {
        Map<Long, Integer> counts = new HashMap<>();
        for (Object[] pair : grouped) {
            counts.put((Long) pair[0], ((Number) pair[1]).intValue());
        }
        return counts;
    }

    private String reviewerName(Long reviewerId) {
        if (reviewerId == null) {
            return null;
        }
        return userRepository.findById(reviewerId).map(User::getUsername).orElse("Reviewer #" + reviewerId);
    }

    private static String trim(String value, int max) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : (cleaned.length() <= max ? cleaned : cleaned.substring(0, max));
    }
}

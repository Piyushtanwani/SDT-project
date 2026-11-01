package com.elearning.services;

import com.elearning.models.Course;
import com.elearning.models.ExamAttempt;
import com.elearning.models.User;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.repositories.ExamProctorEventRepository;
import com.elearning.repositories.ExamSnapshotRepository;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.IntegrityAttemptView;
import com.elearning.response_request.IntegrityOverview;
import com.elearning.response_request.IntegrityRow;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
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

    public ExamIntegrityService(ExamAttemptRepository attemptRepository,
                                ExamProctorEventRepository eventRepository,
                                ExamSnapshotRepository snapshotRepository,
                                CertificateRepository certificateRepository,
                                UserRepository userRepository,
                                CourseRepository courseRepository,
                                ExamProctorService proctorService) {
        this.attemptRepository = attemptRepository;
        this.eventRepository = eventRepository;
        this.snapshotRepository = snapshotRepository;
        this.certificateRepository = certificateRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.proctorService = proctorService;
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
        return view(attemptRepository.save(attempt), true);
    }

    /** Everything the learner can see about their own attempt: the record, not the answer key. */
    public IntegrityAttemptView ownView(ExamAttempt attempt) {
        return view(attempt, false);
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

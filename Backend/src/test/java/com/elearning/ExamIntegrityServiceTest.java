package com.elearning;

import com.elearning.models.Course;
import com.elearning.models.Certificate;
import com.elearning.models.ExamAttempt;
import com.elearning.models.ExamProctorEvent;
import com.elearning.models.ExamSnapshot;
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
import com.elearning.services.ExamIntegrityService;
import com.elearning.services.ExamPolicy;
import com.elearning.services.ExamProctorService;
import com.elearning.services.ExamRuleException;
import com.elearning.services.ProctorSignal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The invigilator's side of the record: what the queue is made of, what a reviewer may change and
 * what a candidate is allowed to see about their own attempt.
 */
class ExamIntegrityServiceTest {

    private static final Long REVIEWER_ID = 1L;

    private ExamAttemptRepository attempts;
    private CertificateRepository certificates;
    private UserRepository users;
    private CourseRepository courses;
    private List<ExamProctorEvent> eventLog;
    private ExamIntegrityService service;

    @BeforeEach
    void setUp() {
        attempts = mock(ExamAttemptRepository.class);
        eventLog = new ArrayList<>();
        ExamProctorEventRepository events = mock(ExamProctorEventRepository.class);
        when(events.findByAttemptIdOrderByServerReceivedAtAsc(anyLong())).thenAnswer(invocation -> {
            Long attemptId = invocation.getArgument(0);
            return eventLog.stream().filter(e -> attemptId.equals(e.getAttemptId())).toList();
        });
        when(events.countGrouped(anyCollection())).thenReturn(List.of());
        when(events.save(any(ExamProctorEvent.class))).thenAnswer(invocation -> {
            ExamProctorEvent event = invocation.getArgument(0);
            event.setId((long) eventLog.size() + 1);
            eventLog.add(event);
            return event;
        });
        ExamSnapshotRepository snapshots = mock(ExamSnapshotRepository.class);
        when(snapshots.findByAttemptIdOrderByServerReceivedAtAsc(anyLong())).thenAnswer(invocation -> {
            Long attemptId = invocation.getArgument(0);
            List<ExamSnapshot> owned = new ArrayList<>();
            snapshot(attemptId).forEach(owned::add);
            return owned;
        });
        when(snapshots.countGrouped(anyCollection())).thenReturn(List.of());

        certificates = mock(CertificateRepository.class);
        when(certificates.findByUserId(anyLong())).thenReturn(List.of());
        users = mock(UserRepository.class);
        when(users.findAllById(any())).thenAnswer(invocation -> {
            Iterable<?> ids = invocation.getArgument(0);
            List<User> found = new ArrayList<>();
            if (ids != null) {
                ids.forEach(id -> found.add(user((Long) id)));
            }
            return found;
        });
        when(users.findById(anyLong())).thenAnswer(invocation -> Optional.of(user(invocation.getArgument(0))));
        courses = mock(CourseRepository.class);
        when(courses.findAllById(any())).thenAnswer(invocation -> {
            Iterable<?> ids = invocation.getArgument(0);
            List<Course> found = new ArrayList<>();
            if (ids != null) {
                ids.forEach(id -> found.add(new Course((Long) id, "Cloud Engineering", "desc", "6 weeks", null, 4.7)));
            }
            return found;
        });
        when(courses.findById(anyLong())).thenAnswer(invocation ->
                Optional.of(new Course(invocation.getArgument(0), "Cloud Engineering", "d", "6 weeks", null, 4.7)));

        ExamPolicy policy = new ExamPolicy(40, 90, 3, 6, 120, 6, 3, 400, 15, 200);
        service = new ExamIntegrityService(attempts, events, snapshots, certificates, users, courses,
                new ExamProctorService(events, snapshots, policy));
    }

    private List<ExamSnapshot> snapshot(Long attemptId) {
        ExamSnapshot frame = new ExamSnapshot();
        frame.setId(1L);
        frame.setAttemptId(attemptId);
        frame.setUserId(7L);
        frame.setLabel("START");
        frame.setServerReceivedAt(LocalDateTime.now());
        frame.setImageDataUrl("data:image/jpeg;base64,/9j/AAAA");
        return List.of(frame);
    }

    private static User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setUsername(id.equals(REVIEWER_ID) ? "invigilator" : "learner" + id);
        user.setEmail("learner" + id + "@example.test");
        return user;
    }

    private static ExamAttempt attempt(Long id, String status, String integrity, int points) {
        ExamAttempt attempt = new ExamAttempt();
        attempt.setId(id);
        attempt.setUserId(7L);
        attempt.setCourseId(3L);
        attempt.setStatus(status);
        attempt.setIntegrity(integrity);
        attempt.setScore(92.0);
        attempt.setPassed(true);
        attempt.setViolationPoints(points);
        attempt.setViolationCount(points);
        attempt.setAttemptNumber(1);
        attempt.setTotalQuestions(25);
        attempt.setCorrectCount(23);
        attempt.setAttemptedAt(LocalDateTime.now());
        attempt.setStartedAt(LocalDateTime.now().minusMinutes(30));
        attempt.setSubmittedAt(LocalDateTime.now().minusMinutes(2));
        attempt.setUserAgent("Mozilla/5.0 (Macintosh) TestBrowser");
        return attempt;
    }

    @Test
    @DisplayName("The overview counts every state and hands back the queue that needs a decision")
    void overviewCountsAndQueue() {
        when(attempts.findTop50ByOrderByIdDesc()).thenReturn(List.of(
                attempt(1L, ExamAttempt.STATUS_IN_PROGRESS, ExamAttempt.INTEGRITY_CLEAN, 0),
                attempt(2L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED, 9),
                attempt(3L, ExamAttempt.STATUS_EXPIRED, ExamAttempt.INTEGRITY_REVIEW, 4),
                attempt(4L, ExamAttempt.STATUS_VOIDED, ExamAttempt.INTEGRITY_FLAGGED, 12)));
        when(attempts.findAwaitingReview(any())).thenReturn(List.of(attempt(2L,
                ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED, 9)));

        IntegrityOverview overview = service.overview();

        assertEquals(4, overview.totalAttempts());
        assertEquals(1, overview.inProgress());
        assertEquals(1, overview.submitted());
        assertEquals(1, overview.expired());
        assertEquals(2, overview.flagged());
        assertEquals(1, overview.review());
        assertEquals(1, overview.voided());
        assertEquals(4, overview.attemptsToday());
        assertEquals(1, overview.awaitingReview().size());
        assertEquals(2L, overview.awaitingReview().get(0).attemptId());
    }

    @Test
    @DisplayName("Rows carry the names the server knows, so a candidate cannot relabel their own record")
    void rowsAreNamedByTheServer() {
        when(attempts.findTop50ByOrderByIdDesc()).thenReturn(List.of(attempt(1L,
                ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_CLEAN, 0)));

        IntegrityRow row = service.list(null, null, null).get(0);

        assertEquals("learner7", row.userName());
        assertEquals("Cloud Engineering", row.courseName());
        assertEquals(92.0, row.score());
        assertEquals(ExamAttempt.STATUS_SUBMITTED, row.status());
        assertEquals(1680, row.durationSeconds(), "30 minutes of exam time, minus the last two");
        assertNotNull(row.startedAt());
    }

    @Test
    @DisplayName("Unknown learner and course ids still render as rows rather than failing the page")
    void unknownNamesFallBack() {
        when(attempts.findTop50ByOrderByIdDesc()).thenReturn(List.of(attempt(1L,
                ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_CLEAN, 0)));
        when(users.findAllById(any())).thenReturn(List.of());
        when(courses.findAllById(any())).thenReturn(List.of());

        IntegrityRow row = service.list(null, null, null).get(0);

        assertEquals("Unknown learner", row.userName());
        assertEquals("Unknown course", row.courseName());
    }

    @Test
    @DisplayName("The register filters by verdict, course and learner")
    void listFilters() {
        when(attempts.findTop50ByIntegrityOrderByIdDesc("FLAGGED"))
                .thenReturn(List.of(attempt(2L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED, 9)));
        when(attempts.findTop50ByCourseIdOrderByIdDesc(3L))
                .thenReturn(List.of(attempt(1L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_CLEAN, 0)));
        when(attempts.findTop50ByUserIdOrderByIdDesc(7L))
                .thenReturn(List.of(attempt(1L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_CLEAN, 0)));
        when(attempts.findTop50ByOrderByIdDesc()).thenReturn(List.of(
                attempt(1L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_CLEAN, 0),
                attempt(2L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED, 9)));
        ExamAttempt flagged = attempt(9L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_CLEAN, 0);
        when(attempts.findTop50ByOrderByIdDesc()).thenReturn(List.of(attempt(1L,
                ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_CLEAN, 0), flagged));

        assertEquals(1, service.list("flagged", null, null).size());
        assertEquals(1, service.list(null, 3L, null).size());
        assertEquals(1, service.list(null, null, 7L).size());
        assertEquals(2, service.list(null, null, null).size());
        // CLEAN has no indexed query of its own, so it is filtered out of the recent slice.
        assertTrue(service.list("  CLEAN ", null, null).stream()
                .allMatch(row -> ExamAttempt.INTEGRITY_CLEAN.equals(row.integrity())));
    }

    @Test
    @DisplayName("A reviewer's decision is written down with the reviewer and lands on the timeline")
    void reviewDecisionIsAttributable() {
        ExamAttempt flagged = attempt(2L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED, 9);
        when(attempts.findById(2L)).thenReturn(Optional.of(flagged));
        when(attempts.save(any(ExamAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        IntegrityAttemptView view = service.review(2L, REVIEWER_ID, "CLEAN", "Frames show a single monitor, no second screen.");

        assertEquals(ExamAttempt.INTEGRITY_CLEAN, view.integrity());
        assertEquals("Frames show a single monitor, no second screen.", view.reviewNote());
        assertEquals("invigilator", view.reviewedBy());
        assertNotNull(view.reviewedAt());
        assertTrue(eventLog.stream().anyMatch(e -> ProctorSignal.REVIEW_DECISION.name().equals(e.getKind())),
                "clearing a flag must be as visible as raising one");
        assertTrue(eventLog.get(eventLog.size() - 1).getDetail().contains("invigilator set CLEAN"),
                "the timeline names the person who decided, not a numeric id the learner cannot read");
    }

    @Test
    @DisplayName("A reviewer's decision never changes the score the machine computed")
    void reviewLeavesTheScoreAlone() {
        ExamAttempt flagged = attempt(2L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED, 9);
        when(attempts.findById(2L)).thenReturn(Optional.of(flagged));
        when(attempts.save(any(ExamAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        IntegrityAttemptView view = service.review(2L, REVIEWER_ID, "FLAGGED", "Confirmed with the learner.");

        assertEquals(92.0, view.score());
        assertEquals(9, view.violationPoints(), "the signals stay exactly as they were collected");
    }

    @Test
    @DisplayName("Only the three real verdicts are accepted")
    void reviewRejectsInventedVerdicts() {
        when(attempts.findById(2L)).thenReturn(Optional.of(attempt(2L,
                ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED, 9)));

        for (String verdict : Arrays.asList("", null, "INNOCENT", "CLEANED", "delete")) {
            ExamRuleException thrown = assertThrows(ExamRuleException.class,
                    () -> service.review(2L, REVIEWER_ID, verdict, "note"));
            assertEquals(ExamRuleException.Kind.POLICY, thrown.kind());
        }
    }

    @Test
    @DisplayName("Voiding throws a result out without erasing it, and still costs the sitting")
    void voidingKeepsTheEvidence() {
        ExamAttempt passed = attempt(2L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED, 9);
        when(attempts.findById(2L)).thenReturn(Optional.of(passed));
        when(attempts.save(any(ExamAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        IntegrityAttemptView view = service.voidAttempt(2L, REVIEWER_ID, "Two accounts, same room.");

        assertEquals(ExamAttempt.STATUS_VOIDED, view.status());
        assertEquals(ExamAttempt.INTEGRITY_FLAGGED, view.integrity());
        assertEquals(92.0, view.score(), "the score is retained as evidence, not deleted");
        assertEquals("Two accounts, same room.", view.reviewNote());
        assertTrue(eventLog.stream().anyMatch(e -> ProctorSignal.VOIDED_BY_REVIEWER.name().equals(e.getKind())));
        assertTrue(eventLog.get(eventLog.size() - 1).getDetail().contains("Voided by invigilator"),
                "the candidate reads this line, so it has to say who threw the result out");
    }

    @Test
    @DisplayName("A reviewer can see the frames, a candidate cannot pull someone else's")
    void detailCarriesImagesButOwnViewDoesNot() {
        ExamAttempt attempt = attempt(2L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_REVIEW, 4);
        when(attempts.findById(2L)).thenReturn(Optional.of(attempt));

        IntegrityAttemptView admin = service.detail(2L);
        IntegrityAttemptView learner = service.ownView(attempt);

        assertEquals(1, admin.snapshots().size());
        assertTrue(learner.snapshots().isEmpty(), "the learner's copy is the timeline, not the frame archive");
        assertEquals(admin.events().size(), learner.events().size(), "both read the same record of signals");
        assertEquals("Mozilla/5.0 (Macintosh) TestBrowser", admin.userAgent());
    }

    @Test
    @DisplayName("The view says whether the attempt already produced a credential")
    void certificateLinkageIsVisible() {
        ExamAttempt attempt = attempt(2L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_CLEAN, 0);
        when(attempts.findById(2L)).thenReturn(Optional.of(attempt));
        Certificate issued = new Certificate();
        issued.setUserId(7L);
        issued.setCourseId(3L);
        issued.setCredentialId("BC12345678");
        when(certificates.findByUserId(7L)).thenReturn(List.of(issued));

        assertTrue(service.detail(2L).certificateIssued());

        when(certificates.findByUserId(7L)).thenReturn(List.of());
        assertFalse(service.detail(2L).certificateIssued());
    }

    @Test
    @DisplayName("An attempt id that does not exist is refused on every read and write")
    void missingAttemptsAreNotFound() {
        when(attempts.findById(99L)).thenReturn(Optional.empty());

        for (Runnable call : List.<Runnable>of(
                () -> service.detail(99L),
                () -> service.review(99L, REVIEWER_ID, "CLEAN", null),
                () -> service.voidAttempt(99L, REVIEWER_ID, null))) {
            ExamRuleException thrown = assertThrows(ExamRuleException.class, call::run);
            assertEquals(ExamRuleException.Kind.NOT_FOUND, thrown.kind());
        }
    }

    @Test
    @DisplayName("A reviewer id the database does not know is still printed as a traceable label")
    void reviewerFallbackName() {
        ExamAttempt attempt = attempt(2L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED, 9);
        when(attempts.findById(2L)).thenReturn(Optional.of(attempt));
        when(attempts.save(any(ExamAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(users.findById(424242L)).thenReturn(Optional.empty());

        IntegrityAttemptView view = service.review(2L, 424242L, "REVIEW", "needs a second look");

        assertEquals("Reviewer #424242", view.reviewedBy());
    }

    @Test
    @DisplayName("A blank note is stored as nothing rather than an empty string")
    void blankNotesAreDropped() {
        ExamAttempt attempt = attempt(2L, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED, 9);
        when(attempts.findById(2L)).thenReturn(Optional.of(attempt));
        when(attempts.save(any(ExamAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertNull(service.review(2L, REVIEWER_ID, "CLEAN", "   ").reviewNote());
    }
}

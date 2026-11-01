package com.elearning;

import com.elearning.models.ExamAttempt;
import com.elearning.models.ExamProctorEvent;
import com.elearning.models.ExamQuestion;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.repositories.ExamProctorEventRepository;
import com.elearning.repositories.ExamQuestionRepository;
import com.elearning.repositories.ExamSnapshotRepository;
import com.elearning.security.JwtService;
import com.elearning.services.ExamDrawService;
import com.elearning.services.ExamPolicy;
import com.elearning.services.ExamProctorService;
import com.elearning.services.ExamRuleException;
import com.elearning.services.ExamSessionService;
import com.elearning.services.ProctorSignal;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The attempt row is the exam. These tests are the proof that the clock, the question set, the
 * answer sheet and the score all come from the server's copy of the sitting rather than from
 * anything the candidate's browser sends.
 */
class ExamSessionServiceTest {

    private static final Long COURSE_ID = 1L;
    private static final Long USER_ID = 7L;
    private static final Long OTHER_USER = 99L;
    private static final String SECRET = "unit-test-signing-secret-that-is-long-enough-hs256";
    private static final String UA = "Mozilla/5.0 (Macintosh) TestBrowser";

    private ExamAttemptRepository attempts;
    private ExamProctorService proctor;
    private JwtService jwtService;
    private ExamPolicy policy;
    private ExamSessionService service;
    private List<ExamQuestion> bank;
    private List<ExamProctorEvent> eventLog;

    @BeforeEach
    void setUp() {
        ExamQuestionRepository questionRepository = mock(ExamQuestionRepository.class);
        bank = questionBank(40);
        when(questionRepository.findByCourseId(COURSE_ID)).thenAnswer(invocation -> bank);
        when(questionRepository.findByCourseId(999L)).thenReturn(Collections.emptyList());
        when(questionRepository.findAllById(any())).thenAnswer(invocation -> {
            Iterable<?> requested = invocation.getArgument(0);
            List<Long> ids = new ArrayList<>();
            requested.forEach(id -> ids.add((Long) id));
            return bank.stream().filter(q -> ids.contains(q.getId())).toList();
        });

        attempts = mock(ExamAttemptRepository.class);
        AtomicLong sequence = new AtomicLong(500);
        when(attempts.save(any(ExamAttempt.class))).thenAnswer(invocation -> {
            ExamAttempt attempt = invocation.getArgument(0);
            if (attempt.getId() == null) {
                attempt.setId(sequence.getAndIncrement());
            }
            return attempt;
        });
        when(attempts.findById(anyLong())).thenReturn(Optional.empty());

        // The real proctor service, so a refused submit has to leave a genuine event row behind
        // rather than merely a Mockito call somebody could forget to verify.
        eventLog = new ArrayList<>();
        ExamProctorEventRepository events = mock(ExamProctorEventRepository.class);
        when(events.findByAttemptIdOrderByServerReceivedAtAsc(anyLong())).thenAnswer(invocation -> {
            Long attemptId = invocation.getArgument(0);
            return eventLog.stream().filter(e -> attemptId.equals(e.getAttemptId())).toList();
        });
        when(events.countByAttemptId(anyLong())).thenAnswer(invocation ->
                eventLog.stream().filter(e -> invocation.getArgument(0).equals(e.getAttemptId())).count());
        when(events.save(any(ExamProctorEvent.class))).thenAnswer(invocation -> {
            ExamProctorEvent event = invocation.getArgument(0);
            event.setId((long) eventLog.size() + 1);
            eventLog.add(event);
            return event;
        });

        jwtService = new JwtService(SECRET, 86400000L);
        policy = new ExamPolicy(40, 90, 3, 6, 120, 6, 3, 400, 15, 200);
        proctor = new ExamProctorService(events, mock(ExamSnapshotRepository.class), policy);
        service = new ExamSessionService(attempts,
                new ExamDrawService(questionRepository), proctor, jwtService, policy, new ObjectMapper());
    }

    private List<String> kindsRecorded(Long attemptId) {
        return eventLog.stream()
                .filter(e -> attemptId.equals(e.getAttemptId()))
                .map(ExamProctorEvent::getKind)
                .toList();
    }

    private static List<ExamQuestion> questionBank(int size) {
        List<ExamQuestion> questions = new ArrayList<>();
        for (long i = 1; i <= size; i++) {
            ExamQuestion q = new ExamQuestion();
            q.setId(i);
            q.setCourseId(COURSE_ID);
            q.setQuestionText("Question " + i);
            q.setOptionA("q" + i + "-A");
            q.setOptionB("q" + i + "-B");
            q.setOptionC("q" + i + "-C");
            q.setOptionD("q" + i + "-D");
            q.setCorrectOption("A");
            questions.add(q);
        }
        return questions;
    }

    /** Pressing Start with no sitting open and `sittingsSoFar` already banked. */
    private ExamSessionService.OpenSitting startFresh(int sittingsSoFar) {
        when(attempts.findFirstByUserIdAndCourseIdAndStatusOrderByStartedAtDesc(
                any(), any(), eq(ExamAttempt.STATUS_IN_PROGRESS))).thenReturn(Optional.empty());
        when(attempts.countSittings(any(), any(), any())).thenReturn((long) sittingsSoFar);
        return service.start(USER_ID, COURSE_ID, UA);
    }

    /**
     * Moves the server's own clock onto the row, since that is the only clock the service reads:
     * work already done `startedSecondsAgo` ago, with `secondsLeft` to go (negative means overdue).
     */
    private static void runClock(ExamAttempt attempt, long startedSecondsAgo, long secondsLeft) {
        LocalDateTime now = LocalDateTime.now();
        attempt.setStartedAt(now.minusSeconds(startedSecondsAgo));
        attempt.setDeadline(now.plusSeconds(secondsLeft));
    }

    private void openIs(ExamAttempt attempt) {
        when(attempts.findById(attempt.getId())).thenReturn(Optional.of(attempt));
    }

    private static Map<Long, String> allCorrect(List<ExamQuestion> drawn) {
        Map<Long, String> answers = new LinkedHashMap<>();
        drawn.forEach(q -> answers.put(q.getId(), q.getCorrectOption()));
        return answers;
    }

    /** An open sitting, resumed by id, with the server's clock set part-way through the exam. */
    private ExamSessionService.OpenSitting midExam() {
        ExamSessionService.OpenSitting sitting = startFresh(0);
        runClock(sitting.attempt(), 20 * 60, 20 * 60);
        openIs(sitting.attempt());
        return sitting;
    }

    @Test
    @DisplayName("Start creates an open sitting holding the deadline, the drawn ids and the option orders")
    void startCreatesTheServerOwnedSession() {
        ExamSessionService.OpenSitting sitting = startFresh(0);
        ExamAttempt saved = sitting.attempt();

        assertEquals(ExamAttempt.STATUS_IN_PROGRESS, saved.getStatus());
        assertEquals(ExamAttempt.INTEGRITY_CLEAN, saved.getIntegrity());
        assertEquals(1, saved.getAttemptNumber());
        assertEquals(25, saved.getTotalQuestions());
        assertEquals(USER_ID, saved.getUserId());
        assertEquals(COURSE_ID, saved.getCourseId());
        assertEquals(UA, saved.getUserAgent());
        assertNotNull(saved.getStartedAt());
        assertEquals(policy.duration(), Duration.between(saved.getStartedAt(), saved.getDeadline()));
        assertEquals(25, sitting.questions().size());
        assertEquals(25, saved.getQuestionIds().split(",").length);
        assertNotNull(saved.getOptionOrders());
        assertNotNull(saved.getDrawTokenId(), "the row must know which signed set belongs to it");
    }

    @Test
    @DisplayName("The draw token is bound to this attempt and this attempt only")
    void tokenIsBoundToTheAttempt() {
        ExamSessionService.OpenSitting sitting = startFresh(0);
        JwtService.ExamDrawClaims claims = jwtService.parseExamDrawToken(sitting.drawToken());

        assertEquals(sitting.attempt().getId(), claims.attemptId());
        assertEquals(USER_ID, claims.userId());
        assertEquals(COURSE_ID, claims.courseId());
        assertEquals(sitting.attempt().getDrawTokenId(), claims.tokenId());
        assertEquals(sitting.questions().stream().map(ExamQuestion::getId).collect(Collectors.toSet()),
                new java.util.HashSet<>(claims.questionIds()));
    }

    @Test
    @DisplayName("A refresh resumes the running exam with the same questions instead of banking a second attempt")
    void refreshResumesTheSameSitting() {
        ExamSessionService.OpenSitting first = startFresh(0);
        ExamAttempt open = first.attempt();
        when(attempts.findFirstByUserIdAndCourseIdAndStatusOrderByStartedAtDesc(
                USER_ID, COURSE_ID, ExamAttempt.STATUS_IN_PROGRESS)).thenReturn(Optional.of(open));

        ExamSessionService.OpenSitting resumed = service.start(USER_ID, COURSE_ID, UA);

        assertEquals(open.getId(), resumed.attempt().getId());
        assertEquals(1, resumed.attempt().getAttemptNumber());
        assertNotNull(resumed.drawToken(), "the refreshed page must be able to hand in");
        assertNotEquals(first.drawToken(), resumed.drawToken(),
                "a resume re-mints the draw, so only the page that reloaded can submit");
        assertEquals(
                first.questions().stream().map(ExamQuestion::getId).toList(),
                resumed.questions().stream().map(ExamQuestion::getId).toList(),
                "the same sitting must show the same questions in the same order");
        assertEquals(
                first.questions().stream().map(ExamQuestion::getOptionA).toList(),
                resumed.questions().stream().map(ExamQuestion::getOptionA).toList());
    }

    @Test
    @DisplayName("The token a page held before a refresh stops working, so a second tab cannot submit over the live one")
    void refreshedPageRetiresTheOldToken() {
        ExamSessionService.OpenSitting first = startFresh(0);
        ExamAttempt open = first.attempt();
        runClock(open, 20 * 60, 20 * 60);
        openIs(open);
        when(attempts.findFirstByUserIdAndCourseIdAndStatusOrderByStartedAtDesc(
                USER_ID, COURSE_ID, ExamAttempt.STATUS_IN_PROGRESS)).thenReturn(Optional.of(open));

        ExamSessionService.OpenSitting resumed = service.start(USER_ID, COURSE_ID, UA);

        ExamRuleException thrown = assertThrows(ExamRuleException.class, () ->
                service.submit(open.getId(), USER_ID, first.drawToken(), Map.of()));
        assertEquals(ExamRuleException.Kind.STALE, thrown.kind());
        assertTrue(kindsRecorded(open.getId()).contains("TOKEN_REPLAY"));

        open.setStartedAt(LocalDateTime.now().minusMinutes(20));
        ExamAttempt submitted = service.submit(open.getId(), USER_ID, resumed.drawToken(), Map.of());
        assertEquals(ExamAttempt.STATUS_SUBMITTED, submitted.getStatus());
    }

    @Test
    @DisplayName("An open sitting whose clock ran out is closed before a new one is drawn")
    void staleOpenSittingIsClosedFirst() {
        ExamSessionService.OpenSitting first = startFresh(0);
        ExamAttempt open = first.attempt();
        runClock(open, 41 * 60, -120);
        when(attempts.findFirstByUserIdAndCourseIdAndStatusOrderByStartedAtDesc(
                USER_ID, COURSE_ID, ExamAttempt.STATUS_IN_PROGRESS)).thenReturn(Optional.of(open));
        when(attempts.countSittings(any(), any(), any())).thenReturn(1L);

        ExamSessionService.OpenSitting next = service.start(USER_ID, COURSE_ID, UA);

        assertEquals(ExamAttempt.STATUS_EXPIRED, open.getStatus());
        assertNotSame(open, next.attempt(), "the candidate gets a new sitting rather than a dead one");
        assertEquals(2, next.attempt().getAttemptNumber());
    }

    @Test
    @DisplayName("The attempt cap is enforced by the server, with the cooldown printed in the refusal")
    void attemptsAreCapped() {
        ExamAttempt last = startFresh(0).attempt();
        last.setStatus(ExamAttempt.STATUS_SUBMITTED);
        last.setSubmittedAt(LocalDateTime.now().plusHours(1));
        when(attempts.countSittings(any(), any(), any())).thenReturn(3L);
        when(attempts.findSittingsNewestFirst(any(), any(), any())).thenReturn(List.of(last));

        ExamRuleException thrown = assertThrows(ExamRuleException.class, () -> service.start(USER_ID, COURSE_ID, UA));

        assertEquals(ExamRuleException.Kind.POLICY, thrown.kind());
        assertTrue(thrown.getMessage().contains("3 attempts"));
        assertTrue(thrown.getMessage().contains("next one opens"));
    }

    @Test
    @DisplayName("Once the cooldown has passed the cap lets one more sitting through")
    void cooldownReleasesTheCap() {
        ExamAttempt last = startFresh(0).attempt();
        last.setStatus(ExamAttempt.STATUS_SUBMITTED);
        last.setSubmittedAt(LocalDateTime.now().minusHours(7));
        when(attempts.countSittings(any(), any(), any())).thenReturn(3L);
        when(attempts.findSittingsNewestFirst(any(), any(), any())).thenReturn(List.of(last));

        ExamSessionService.OpenSitting sitting = service.start(USER_ID, COURSE_ID, UA);

        assertEquals(ExamAttempt.STATUS_IN_PROGRESS, sitting.attempt().getStatus());
        assertEquals(4, sitting.attempt().getAttemptNumber(), "it really was the fourth sitting");
    }

    @Test
    @DisplayName("A course with no question bank refuses to start rather than serving an empty exam")
    void emptyBankRefusesToStart() {
        when(attempts.findFirstByUserIdAndCourseIdAndStatusOrderByStartedAtDesc(
                any(), any(), any())).thenReturn(Optional.empty());
        when(attempts.countSittings(any(), any(), any())).thenReturn(0L);

        ExamRuleException thrown = assertThrows(ExamRuleException.class, () -> service.start(USER_ID, 999L, UA));
        assertEquals(ExamRuleException.Kind.NOT_FOUND, thrown.kind());
    }

    @Test
    @DisplayName("A token from a different sitting cannot grade this one, and the try is recorded")
    void tokenReplayIsRefusedAndRecorded() {
        ExamSessionService.OpenSitting sitting = startFresh(0);
        ExamAttempt attempt = sitting.attempt();
        runClock(attempt, 300, 20 * 60);
        openIs(attempt);
        ExamSessionService.OpenSitting other = service.start(OTHER_USER, COURSE_ID, UA);

        ExamRuleException thrown = assertThrows(ExamRuleException.class, () ->
                service.submit(attempt.getId(), USER_ID, other.drawToken(), allCorrect(sitting.questions())));

        assertEquals(ExamRuleException.Kind.STALE, thrown.kind());
        assertTrue(kindsRecorded(attempt.getId()).contains(ProctorSignal.TOKEN_REPLAY.name()),
                "the replay attempt itself has to be on the record");
        assertEquals(ExamAttempt.STATUS_IN_PROGRESS, attempt.getStatus(), "a refused submit leaves the exam open");
    }

    @Test
    @DisplayName("A forged, expired or missing token is refused the same way")
    void unusableTokensAreRefused() {
        ExamSessionService.OpenSitting sitting = midExam();
        ExamAttempt attempt = sitting.attempt();
        Map<Long, String> answers = allCorrect(sitting.questions());

        assertThrows(ExamRuleException.class, () -> service.submit(attempt.getId(), USER_ID, null, answers));
        assertThrows(ExamRuleException.class, () -> service.submit(attempt.getId(), USER_ID, "not.a.jwt", answers));
        assertThrows(ExamRuleException.class,
                () -> service.submit(attempt.getId(), USER_ID, sitting.drawToken() + "x", answers));
        String expired = jwtService.generateExamDrawToken(USER_ID, COURSE_ID, attempt.getId(), List.of(1L), -1000L);
        assertThrows(ExamRuleException.class, () -> service.submit(attempt.getId(), USER_ID, expired, answers));
    }

    @Test
    @DisplayName("Handing in before the minimum working time is refused, and the attempt is flagged")
    void tooFastSubmitIsRefusedAndFlagged() {
        ExamSessionService.OpenSitting sitting = startFresh(0);
        ExamAttempt attempt = sitting.attempt();
        openIs(attempt);

        ExamRuleException thrown = assertThrows(ExamRuleException.class, () ->
                service.submit(attempt.getId(), USER_ID, sitting.drawToken(), allCorrect(sitting.questions())));

        assertEquals(ExamRuleException.Kind.POLICY, thrown.kind());
        assertEquals(ExamAttempt.INTEGRITY_FLAGGED, attempt.getIntegrity());
        assertEquals(ExamAttempt.STATUS_IN_PROGRESS, attempt.getStatus());
        assertTrue(kindsRecorded(attempt.getId()).contains(ProctorSignal.TOO_FAST_SUBMIT.name()));
    }

    @Test
    @DisplayName("A past-deadline submit is graded only from the sheet the server already holds")
    void lateSubmitGradesTheServerSheet() {
        ExamSessionService.OpenSitting sitting = startFresh(0);
        ExamAttempt attempt = sitting.attempt();
        runClock(attempt, 45 * 60, -5 * 60);
        openIs(attempt);
        service.autosave(attempt.getId(), USER_ID, allCorrect(sitting.questions()));

        // Five minutes late: the answer list the browser now sends is not believed, but the work the
        // server already saved still counts, and the attempt is written off as time-expired.
        ExamAttempt result = service.submit(attempt.getId(), USER_ID, sitting.drawToken(),
                Map.of(sitting.questions().get(0).getId(), "E"));

        assertEquals(ExamAttempt.STATUS_EXPIRED, result.getStatus());
        assertEquals(100.0, result.getScore(), 0.001);
        assertTrue(result.isPassed());
        assertTrue(kindsRecorded(attempt.getId()).containsAll(
                List.of(ProctorSignal.LATE_SUBMIT.name(), ProctorSignal.TIME_EXHAUSTED.name())));
    }

    @Test
    @DisplayName("A submit inside the grace window still counts as on time")
    void graceWindowIsTolerant() {
        ExamSessionService.OpenSitting sitting = startFresh(0);
        ExamAttempt attempt = sitting.attempt();
        runClock(attempt, 41 * 60, -60); // a minute past the deadline, inside the 90-second grace
        openIs(attempt);

        ExamAttempt result = service.submit(attempt.getId(), USER_ID, sitting.drawToken(),
                allCorrect(sitting.questions()));

        assertEquals(ExamAttempt.STATUS_SUBMITTED, result.getStatus());
        assertEquals(100.0, result.getScore(), 0.001);
    }

    @Test
    @DisplayName("An on-time submit is graded from the drawn set with the server's score")
    void normalSubmitIsGradedServerSide() {
        ExamSessionService.OpenSitting sitting = midExam();
        Map<Long, String> answers = allCorrect(sitting.questions());
        sitting.questions().stream().map(ExamQuestion::getId).limit(6).forEach(id -> answers.put(id, "E"));

        ExamAttempt result = service.submit(sitting.attempt().getId(), USER_ID, sitting.drawToken(), answers);

        assertEquals(ExamAttempt.STATUS_SUBMITTED, result.getStatus());
        assertEquals(19, result.getCorrectCount());
        assertEquals(25, result.getTotalQuestions());
        assertEquals(76.0, result.getScore(), 0.001);
        assertFalse(result.isPassed());
        assertNotNull(result.getSubmittedAt());
    }

    @Test
    @DisplayName("Nothing the sender omits becomes a credit: an empty sheet scores zero")
    void emptyAnswerSheetScoresZero() {
        ExamSessionService.OpenSitting sitting = midExam();

        ExamAttempt result = service.submit(sitting.attempt().getId(), USER_ID, sitting.drawToken(), Map.of());

        assertEquals(0.0, result.getScore(), 0.001);
        assertEquals(0, result.getCorrectCount());
        assertEquals(ExamAttempt.STATUS_SUBMITTED, result.getStatus());
    }

    @Test
    @DisplayName("A second submit returns the first result instead of a second grade")
    void doubleSubmitIsIdempotent() {
        ExamSessionService.OpenSitting sitting = midExam();
        ExamAttempt first = service.submit(sitting.attempt().getId(), USER_ID, sitting.drawToken(),
                allCorrect(sitting.questions()));

        ExamAttempt again = service.submit(sitting.attempt().getId(), USER_ID, "spent-and-no-longer-valid", Map.of());

        assertEquals(first.getId(), again.getId());
        assertEquals(100.0, again.getScore(), 0.001);
        assertEquals(ExamAttempt.STATUS_SUBMITTED, again.getStatus());
    }

    @Test
    @DisplayName("An attempt a reviewer voided cannot be re-submitted for a score")
    void voidedAttemptsRejectSubmits() {
        ExamSessionService.OpenSitting sitting = startFresh(0);
        ExamAttempt attempt = sitting.attempt();
        attempt.setStatus(ExamAttempt.STATUS_VOIDED);
        openIs(attempt);

        ExamRuleException thrown = assertThrows(ExamRuleException.class, () ->
                service.submit(attempt.getId(), USER_ID, sitting.drawToken(), allCorrect(sitting.questions())));
        assertEquals(ExamRuleException.Kind.STALE, thrown.kind());
    }

    @Test
    @DisplayName("Someone else's attempt is denied, and a missing one is not found — never the other way round")
    void ownershipIsEnforced() {
        ExamSessionService.OpenSitting sitting = startFresh(0);
        openIs(sitting.attempt());

        ExamRuleException denied = assertThrows(ExamRuleException.class,
                () -> service.autosave(sitting.attempt().getId(), OTHER_USER, Map.of(1L, "A")));
        assertEquals(ExamRuleException.Kind.DENIED, denied.kind());
        assertNull(sitting.attempt().getAnswers(), "someone else's write must not touch the sheet");

        ExamRuleException missing = assertThrows(ExamRuleException.class,
                () -> service.ownedAttempt(9999L, USER_ID));
        assertEquals(ExamRuleException.Kind.NOT_FOUND, missing.kind());
    }

    @Test
    @DisplayName("Autosave stops once the paper is handed in")
    void autosaveRejectsClosedAttempts() {
        ExamSessionService.OpenSitting sitting = midExam();
        service.submit(sitting.attempt().getId(), USER_ID, sitting.drawToken(), allCorrect(sitting.questions()));

        ExamRuleException thrown = assertThrows(ExamRuleException.class,
                () -> service.autosave(sitting.attempt().getId(), USER_ID, Map.of(1L, "A")));
        assertEquals(ExamRuleException.Kind.STALE, thrown.kind());
    }

    @Test
    @DisplayName("Autosaved answers survive as the sheet that gets graded")
    void autosavedSheetIsUsedWhenTheSubmitSendsNothing() {
        ExamSessionService.OpenSitting sitting = midExam();
        service.autosave(sitting.attempt().getId(), USER_ID, allCorrect(sitting.questions()));

        ExamAttempt result = service.submit(sitting.attempt().getId(), USER_ID, sitting.drawToken(), null);

        assertEquals(100.0, result.getScore(), 0.001);
    }

    @Test
    @DisplayName("The scheduled sweep closes sittings whose clock ran out with the tab shut")
    void sweepClosesOverdueSittings() {
        ExamSessionService.OpenSitting sitting = startFresh(0);
        ExamAttempt attempt = sitting.attempt();
        runClock(attempt, 50 * 60, -10 * 60);
        when(attempts.findByStatusAndDeadlineBefore(any(), any())).thenReturn(List.of(attempt));
        openIs(attempt);
        service.autosave(attempt.getId(), USER_ID, allCorrect(sitting.questions()));

        service.sweepExpiredSittings();

        assertEquals(ExamAttempt.STATUS_EXPIRED, attempt.getStatus());
        assertEquals(100.0, attempt.getScore(), 0.001);
        assertTrue(kindsRecorded(attempt.getId()).contains(ProctorSignal.TIME_EXHAUSTED.name()));
    }

    @Test
    @DisplayName("One sitting that fails to close does not stop the others in the sweep")
    void sweepSurvivesFailures() {
        ExamAttempt broken = startFresh(0).attempt();
        runClock(broken, 50 * 60, -10 * 60);
        ExamAttempt healthy = startFresh(0).attempt();
        runClock(healthy, 50 * 60, -10 * 60);
        when(attempts.save(any(ExamAttempt.class))).thenAnswer(invocation -> {
            ExamAttempt attempt = invocation.getArgument(0);
            if (attempt.getId().equals(broken.getId())) {
                throw new IllegalStateException("database hiccup");
            }
            return attempt;
        });
        when(attempts.findByStatusAndDeadlineBefore(any(), any())).thenReturn(List.of(broken, healthy));

        service.sweepExpiredSittings();

        assertEquals(ExamAttempt.STATUS_EXPIRED, healthy.getStatus(),
                "a row that failed to write must not stall the rest of the sweep");
    }

    @Test
    @DisplayName("Violation points decide the verdict when the paper is closed")
    void verdictComesFromTheWeightedRecord() {
        ExamSessionService.OpenSitting sitting = midExam();
        sitting.attempt().setViolationPoints(policy.reviewThreshold());

        ExamAttempt result = service.submit(sitting.attempt().getId(), USER_ID, sitting.drawToken(),
                allCorrect(sitting.questions()));

        assertEquals(ExamAttempt.INTEGRITY_REVIEW, result.getIntegrity());
    }

    @Test
    @DisplayName("Points alone cannot un-flag an attempt that was already flagged")
    void verdictNeverSoftens() {
        ExamSessionService.OpenSitting sitting = midExam();
        sitting.attempt().setIntegrity(ExamAttempt.INTEGRITY_FLAGGED);
        sitting.attempt().setViolationPoints(0);

        ExamAttempt result = service.submit(sitting.attempt().getId(), USER_ID, sitting.drawToken(),
                allCorrect(sitting.questions()));

        assertEquals(ExamAttempt.INTEGRITY_FLAGGED, result.getIntegrity());
    }

    @Test
    @DisplayName("The standing a learner sees matches the sittings actually banked")
    void standingReportsWhatIsLeft() {
        when(attempts.countSittings(any(), any(), any())).thenReturn(1L);
        ExamSessionService.Standing standing = service.standing(USER_ID, COURSE_ID);

        assertEquals(1, standing.attemptsUsed());
        assertEquals(2, standing.attemptsRemaining());
        assertNull(standing.nextAllowedAt());
    }

    @Test
    @DisplayName("A sitting a reviewer voided still counts as spent, so voiding cannot buy a retake")
    void voidedSittingsStillCountAgainstTheCap() {
        ArgumentCaptor<Collection<String>> counted = ArgumentCaptor.forClass(Collection.class);
        when(attempts.countSittings(any(), any(), any())).thenReturn(0L);

        service.standing(USER_ID, COURSE_ID);

        verify(attempts).countSittings(eq(USER_ID), eq(COURSE_ID), counted.capture());
        assertTrue(counted.getValue().contains(ExamAttempt.STATUS_VOIDED),
                "the cap must be measured over every sitting the candidate actually took");
    }
}

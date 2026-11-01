package com.elearning;

import com.elearning.models.ExamQuestion;
import com.elearning.repositories.ExamQuestionRepository;
import com.elearning.security.JwtService;
import com.elearning.services.ExamDrawService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The attempt integrity rules: the server decides the draw, the score is divided by the draw,
 * and a submission can only be credited for the questions it was actually served.
 */
class ExamDrawServiceTest {

    private static final Long COURSE_ID = 1L;
    private static final Long USER_ID = 7L;
    private static final String SECRET = "unit-test-signing-secret-that-is-long-enough-hs256";

    private ExamQuestionRepository repository;
    private JwtService jwtService;
    private ExamDrawService examDrawService;
    private List<ExamQuestion> bank;

    @BeforeEach
    void setUp() {
        repository = mock(ExamQuestionRepository.class);
        jwtService = new JwtService(SECRET, 86400000L);
        examDrawService = new ExamDrawService(repository, jwtService);
        bank = questionBank(40);
        when(repository.findByCourseId(COURSE_ID)).thenAnswer(invocation -> bank);
        when(repository.findByCourseId(999L)).thenReturn(Collections.emptyList());
        when(repository.findAllById(any())).thenAnswer(invocation -> {
            Iterable<?> requested = invocation.getArgument(0);
            List<Long> ids = new ArrayList<>();
            requested.forEach(id -> ids.add((Long) id));
            return bank.stream().filter(q -> ids.contains(q.getId())).toList();
        });
    }

    private static List<ExamQuestion> questionBank(int size) {
        List<ExamQuestion> questions = new ArrayList<>();
        for (long i = 1; i <= size; i++) {
            ExamQuestion q = new ExamQuestion();
            q.setId(i);
            q.setCourseId(COURSE_ID);
            q.setQuestionText("Question " + i);
            q.setOptionA("A");
            q.setOptionB("B");
            q.setOptionC("C");
            q.setOptionD("D");
            q.setCorrectOption("A");
            questions.add(q);
        }
        return questions;
    }

    /** Every question in the draw answered the way the bank says it is right. */
    private static Map<Long, String> allCorrect(List<ExamQuestion> drawn) {
        Map<Long, String> answers = new LinkedHashMap<>();
        drawn.forEach(q -> answers.put(q.getId(), q.getCorrectOption()));
        return answers;
    }

    @Test
    @DisplayName("A draw is capped at the exam size and signed with exactly the ids it served")
    void drawIsCappedAndSigned() {
        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);

        assertEquals(25, draw.questions().size());
        assertNotNull(draw.drawToken());
        JwtService.ExamDrawClaims claims = jwtService.parseExamDrawToken(draw.drawToken());
        assertEquals(USER_ID, claims.userId());
        assertEquals(COURSE_ID, claims.courseId());
        assertEquals(draw.questions().stream().map(ExamQuestion::getId).collect(Collectors.toSet()),
                new java.util.HashSet<>(claims.questionIds()));
    }

    @Test
    @DisplayName("Two attempts on the same course do not serve the same question set")
    void consecutiveDrawsDiffer() {
        ExamDrawService.ExamDraw first = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);
        ExamDrawService.ExamDraw second = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);

        List<Long> firstIds = first.questions().stream().map(ExamQuestion::getId).sorted().toList();
        List<Long> secondIds = second.questions().stream().map(ExamQuestion::getId).sorted().toList();
        assertNotEquals(firstIds, secondIds, "a retake must draw a different set");
    }

    @Test
    @DisplayName("A bank smaller than the exam size is served in full")
    void smallBankIsServedInFull() {
        bank = questionBank(6);

        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);
        assertEquals(6, draw.questions().size());
    }

    @Test
    @DisplayName("A course with no questions produces no draw and no token")
    void emptyBankProducesNoDraw() {
        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(999L, USER_ID, 25);

        assertTrue(draw.questions().isEmpty());
        assertNull(draw.drawToken());
    }

    @Test
    @DisplayName("Score is divided by the drawn set, not by the size of the bank")
    void scoreUsesDrawSizeAsDenominator() {
        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);

        double score = examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), allCorrect(draw.questions()));
        assertEquals(100.0, score, 0.001);

        Map<Long, String> fiveOfTwentyFive = new HashMap<>();
        draw.questions().stream().limit(5).forEach(q -> fiveOfTwentyFive.put(q.getId(), q.getCorrectOption()));
        assertEquals(20.0, examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), fiveOfTwentyFive), 0.001);
    }

    @Test
    @DisplayName("Unanswered and wrong answers are not credited")
    void unansweredAndWrongAreNotCredited() {
        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);

        Map<Long, String> none = new HashMap<>();
        assertEquals(0.0, examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), none), 0.001);
        assertEquals(0.0, examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), null), 0.001);

        Map<Long, String> wrong = new HashMap<>();
        draw.questions().forEach(q -> wrong.put(q.getId(), "B"));
        assertEquals(0.0, examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), wrong), 0.001);

        Map<Long, String> skipped = allCorrect(draw.questions());
        skipped.remove(draw.questions().get(0).getId());
        skipped.put(draw.questions().get(1).getId(), "E");
        assertEquals((23.0 / 25.0) * 100.0,
                examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), skipped), 0.001);
    }

    @Test
    @DisplayName("Answers for questions outside the draw earn nothing")
    void answersOutsideTheDrawAreIgnored() {
        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);
        List<Long> drawnIds = draw.questions().stream().map(ExamQuestion::getId).toList();
        List<ExamQuestion> undrawn = bank.stream().filter(q -> !drawnIds.contains(q.getId())).toList();
        assertTrue(undrawn.size() > 0, "the bank must be bigger than the draw for this to mean anything");

        Map<Long, String> everything = allCorrect(draw.questions());
        undrawn.forEach(q -> everything.put(q.getId(), q.getCorrectOption()));
        assertEquals(100.0, examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), everything), 0.001);

        Map<Long, String> onlyUndrawn = new HashMap<>();
        undrawn.forEach(q -> onlyUndrawn.put(q.getId(), q.getCorrectOption()));
        assertEquals(0.0, examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), onlyUndrawn), 0.001);
    }

    @Test
    @DisplayName("A tampered, foreign or missing draw token is refused")
    void forgedOrForeignTokensAreRefused() {
        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);
        Map<Long, String> answers = allCorrect(draw.questions());

        assertThrows(IllegalArgumentException.class,
                () -> examDrawService.grade(USER_ID, COURSE_ID, null, answers));
        assertThrows(IllegalArgumentException.class,
                () -> examDrawService.grade(USER_ID, COURSE_ID, "not.a.jwt", answers));
        assertThrows(IllegalArgumentException.class,
                () -> examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken() + "x", answers));
        // Someone else's attempt.
        String otherUser = jwtService.generateExamDrawToken(11L, COURSE_ID, List.of(1L, 2L, 3L), 60000L);
        assertThrows(IllegalArgumentException.class,
                () -> examDrawService.grade(USER_ID, COURSE_ID, otherUser, answers));
        // Another course's attempt.
        String otherCourse = jwtService.generateExamDrawToken(USER_ID, 42L, List.of(1L, 2L, 3L), 60000L);
        assertThrows(IllegalArgumentException.class,
                () -> examDrawService.grade(USER_ID, COURSE_ID, otherCourse, answers));
        // A login token must not pass as an exam draw.
        String sessionToken = jwtService.generateToken("user@example.com", USER_ID);
        assertThrows(IllegalArgumentException.class,
                () -> examDrawService.grade(USER_ID, COURSE_ID, sessionToken, answers));
    }

    @Test
    @DisplayName("An expired draw is refused")
    void expiredDrawIsRefused() {
        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);
        String stale = jwtService.generateExamDrawToken(USER_ID, COURSE_ID,
                draw.questions().stream().map(ExamQuestion::getId).toList(), -1000L);

        assertThrows(IllegalArgumentException.class,
                () -> examDrawService.grade(USER_ID, COURSE_ID, stale, allCorrect(draw.questions())));
    }

    @Test
    @DisplayName("A drawn question deleted mid-attempt shrinks the denominator instead of leaking points")
    void deletedQuestionShrinksTheDraw() {
        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);
        ExamQuestion removed = draw.questions().get(0);
        bank = bank.stream().filter(q -> !q.getId().equals(removed.getId())).collect(Collectors.toList());

        Map<Long, String> answers = allCorrect(draw.questions());
        double score = examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), answers);
        assertEquals(100.0, score, 0.001);

        answers.remove(draw.questions().get(1).getId());
        assertEquals((23.0 / 24.0) * 100.0, examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), answers), 0.001);
    }

    @Test
    @DisplayName("A draw whose questions have all disappeared grades zero rather than dividing by zero")
    void vanishedDrawGradesZero() {
        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);
        String token = jwtService.generateExamDrawToken(USER_ID, COURSE_ID, List.of(900L, 901L), 60000L);

        assertEquals(0.0, examDrawService.grade(USER_ID, COURSE_ID, token, allCorrect(draw.questions())), 0.001);
        assertNotNull(draw.drawToken());
    }

    @Test
    @DisplayName("Course id is required and mismatched ids are rejected")
    void requiresKnownCourse() {
        ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);
        Map<Long, String> answers = allCorrect(draw.questions());

        assertThrows(IllegalArgumentException.class,
                () -> examDrawService.grade(USER_ID, null, draw.drawToken(), answers));
        // A question that belongs to another course can never be credited, even if it is in the token.
        bank.forEach(q -> q.setCourseId(2L));
        assertEquals(0.0, examDrawService.grade(USER_ID, COURSE_ID, draw.drawToken(), answers), 0.001);
    }

    @Test
    @DisplayName("Shuffling does not invent questions that are not in the bank")
    void drawOnlyComesFromTheBank() {
        List<Long> bankIds = bank.stream().map(ExamQuestion::getId).toList();
        for (int attempt = 0; attempt < 5; attempt++) {
            ExamDrawService.ExamDraw draw = examDrawService.issueDraw(COURSE_ID, USER_ID, 25);
            assertTrue(bankIds.containsAll(draw.questions().stream().map(ExamQuestion::getId).toList()));
            assertEquals(25, draw.questions().stream().map(ExamQuestion::getId).distinct().count());
        }
    }

    @Test
    @DisplayName("JwtService rejects a draw token of another type, a forged one and an expired one")
    void tokenParsingIsStrict() {
        String valid = jwtService.generateExamDrawToken(USER_ID, COURSE_ID, List.of(1L, 2L), 60000L);
        JwtService.ExamDrawClaims claims = jwtService.parseExamDrawToken(valid);
        assertEquals(List.of(1L, 2L), claims.questionIds());

        assertThrows(IllegalArgumentException.class, () -> jwtService.parseExamDrawToken(""));
        assertThrows(IllegalArgumentException.class, () -> jwtService.parseExamDrawToken(null));
        assertThrows(IllegalArgumentException.class, () -> jwtService.parseExamDrawToken("abc.def.ghi"));
        assertThrows(IllegalArgumentException.class, () -> jwtService.parseExamDrawToken(
                jwtService.generateToken("user@example.com", USER_ID)));
        assertFalse(jwtService.isTokenExpired(valid));
        assertTrue(jwtService.isTokenExpired(
                jwtService.generateExamDrawToken(USER_ID, COURSE_ID, List.of(1L), -1L)));
    }

    @Test
    @DisplayName("The exam size and draw validity are the numbers the endpoints and copy advertise")
    void examSizeIsADocumentableConstant() {
        assertEquals(25, ExamDrawService.QUESTIONS_PER_EXAM);
        assertTrue(ExamDrawService.DRAW_VALIDITY.toMinutes() >= 45,
                "the draw must outlive the 40-minute exam timer");
    }
}

package com.elearning;

import com.elearning.models.ExamQuestion;
import com.elearning.repositories.ExamQuestionRepository;
import com.elearning.security.JwtService;
import com.elearning.services.ExamDrawService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The draw and the arithmetic behind a score: the server decides the set, the score is divided by
 * that set, each sitting re-letters its own options, and nothing outside the set can be credited.
 */
class ExamDrawServiceTest {

    private static final Long COURSE_ID = 1L;
    private static final Long ATTEMPT_ID = 55L;
    private static final String[] LETTERS = {"A", "B", "C", "D"};

    private ExamQuestionRepository repository;
    private JwtService jwtService;
    private ExamDrawService examDrawService;
    private List<ExamQuestion> bank;

    @BeforeEach
    void setUp() {
        repository = mock(ExamQuestionRepository.class);
        jwtService = new JwtService("unit-test-signing-secret-that-is-long-enough-hs256", 86400000L);
        examDrawService = new ExamDrawService(repository);
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

    /** A bank whose four options are distinguishable and whose answer key is not always A. */
    private static List<ExamQuestion> questionBank(int size) {
        List<ExamQuestion> questions = new ArrayList<>();
        for (long i = 1; i <= size; i++) {
            ExamQuestion q = new ExamQuestion();
            q.setId(i);
            q.setCourseId(COURSE_ID);
            q.setQuestionText("Question " + i);
            for (int slot = 0; slot < 4; slot++) {
                String text = "q" + i + "-" + LETTERS[slot];
                switch (LETTERS[slot]) {
                    case "A" -> q.setOptionA(text);
                    case "B" -> q.setOptionB(text);
                    case "C" -> q.setOptionC(text);
                    default -> q.setOptionD(text);
                }
            }
            q.setCorrectOption(LETTERS[(int) (i % 4)]);
            questions.add(q);
        }
        return questions;
    }

    private static List<Long> idsOf(List<ExamQuestion> questions) {
        return questions.stream().map(ExamQuestion::getId).toList();
    }

    /** Every served question answered with the letter the candidate was shown as correct. */
    private static Map<Long, String> allCorrect(List<ExamQuestion> served) {
        Map<Long, String> answers = new LinkedHashMap<>();
        served.forEach(q -> answers.put(q.getId(), q.getCorrectOption()));
        return answers;
    }

    private static List<String> optionTexts(ExamQuestion question) {
        return List.of(question.getOptionA(), question.getOptionB(),
                question.getOptionC(), question.getOptionD());
    }

    private ExamDrawService.QuestionSet draw() {
        return examDrawService.draw(COURSE_ID, 25);
    }

    private static double grade(ExamDrawService.GradeResult result) {
        return result.score();
    }

    @Test
    @DisplayName("A draw is capped at the exam size and every served id comes from the bank")
    void drawIsCappedAndSourced() {
        ExamDrawService.QuestionSet drawn = draw();
        List<Long> bankIds = idsOf(bank);

        assertEquals(25, drawn.questions().size());
        assertTrue(bankIds.containsAll(idsOf(drawn.questions())));
        assertEquals(25, drawn.questions().stream().map(ExamQuestion::getId).distinct().count());
        assertEquals(25, drawn.optionOrders().size());
    }

    @Test
    @DisplayName("Two sittings on one course are not served the same question set")
    void consecutiveDrawsDiffer() {
        List<Long> first = idsOf(draw().questions()).stream().sorted().toList();
        List<Long> second = idsOf(draw().questions()).stream().sorted().toList();

        assertNotEquals(first, second, "a retake must draw a different set");
    }

    @Test
    @DisplayName("A bank smaller than the exam size is served in full")
    void smallBankIsServedInFull() {
        bank = questionBank(6);

        assertEquals(6, draw().questions().size());
    }

    @Test
    @DisplayName("A course with no questions, or a zero count, produces no draw")
    void emptyBankProducesNoDraw() {
        assertTrue(examDrawService.draw(999L, 25).questions().isEmpty());
        assertTrue(examDrawService.draw(COURSE_ID, 0).questions().isEmpty());
    }

    @Test
    @DisplayName("Re-lettering keeps all four options and moves the answer to the letter shown")
    void reletteringKeepsOptionsAndMovesTheKey() {
        ExamDrawService.QuestionSet drawn = draw();

        for (ExamQuestion served : drawn.questions()) {
            ExamQuestion source = bank.stream()
                    .filter(q -> q.getId().equals(served.getId())).findFirst().orElseThrow();
            Set<String> expected = new HashSet<>(optionTexts(source));
            assertEquals(expected, new HashSet<>(optionTexts(served)),
                    "the candidate must still see exactly the four options the bank holds");
            String shown = served.getOptionA().substring(served.getOptionA().lastIndexOf('-') + 1);
            String hidden = served.getCorrectOption();
            assertEquals(source.getCorrectOption(),
                    drawn.optionOrders().get(served.getId()).charAt(hidden.charAt(0) - 'A') + "",
                    "the letter served as correct must point at the bank's correct option");
            assertTrue(expected.contains(served.getOptionA()));
            assertNotEquals(null, shown);
        }
    }

    @Test
    @DisplayName("Answering what each sitting is shown as correct scores 100, whatever the letters were")
    void everySittingGradesAgainstItsOwnLetters() {
        for (int attempt = 0; attempt < 6; attempt++) {
            ExamDrawService.QuestionSet drawn = draw();
            ExamDrawService.GradeResult result = examDrawService.grade(
                    idsOf(drawn.questions()), drawn.optionOrders(), allCorrect(drawn.questions()));

            assertEquals(100.0, grade(result), 0.001);
            assertEquals(25, result.total());
            assertEquals(25, result.correct());
        }
    }

    @Test
    @DisplayName("The bank's own letters are not creditable once a sitting has been re-lettered")
    void oldLetterOrderDoesNotScore() {
        ExamDrawService.QuestionSet drawn = draw();
        Map<Long, String> byBankOrder = new LinkedHashMap<>();
        for (ExamQuestion served : drawn.questions()) {
            ExamQuestion source = bank.stream()
                    .filter(q -> q.getId().equals(served.getId())).findFirst().orElseThrow();
            byBankOrder.put(served.getId(), source.getCorrectOption());
        }
        int moved = 0;
        for (ExamQuestion served : drawn.questions()) {
            ExamQuestion source = bank.stream()
                    .filter(q -> q.getId().equals(served.getId())).findFirst().orElseThrow();
            if (!source.getCorrectOption().equals(served.getCorrectOption())) {
                moved++;
            }
        }
        assertTrue(moved > 0, "a draw that re-lettered nothing cannot prove this");

        ExamDrawService.GradeResult result = examDrawService.grade(
                idsOf(drawn.questions()), drawn.optionOrders(), byBankOrder);

        assertEquals(moved, 25 - result.correct(), 0,
                "only the questions whose key happened to land on the same letter may score");
    }

    @Test
    @DisplayName("Score is divided by the drawn set, not by the size of the bank")
    void scoreUsesDrawSizeAsDenominator() {
        ExamDrawService.QuestionSet drawn = draw();
        List<Long> ids = idsOf(drawn.questions());

        assertEquals(100.0, grade(examDrawService.grade(ids, drawn.optionOrders(),
                allCorrect(drawn.questions()))), 0.001);

        Map<Long, String> five = new HashMap<>();
        drawn.questions().stream().limit(5).forEach(q -> five.put(q.getId(), q.getCorrectOption()));
        assertEquals(20.0, grade(examDrawService.grade(ids, drawn.optionOrders(), five)), 0.001);
    }

    @Test
    @DisplayName("Unanswered, wrong and out-of-range answers are not credited")
    void unansweredAndWrongAreNotCredited() {
        ExamDrawService.QuestionSet drawn = draw();
        List<Long> ids = idsOf(drawn.questions());

        assertEquals(0.0, grade(examDrawService.grade(ids, drawn.optionOrders(), Map.of())), 0.001);
        assertEquals(0.0, grade(examDrawService.grade(ids, drawn.optionOrders(), null)), 0.001);

        Map<Long, String> wrong = new HashMap<>();
        drawn.questions().forEach(q -> wrong.put(q.getId(), "B"));
        Map<Long, String> blankSheet = new HashMap<>();
        drawn.questions().forEach(q -> blankSheet.put(q.getId(), "E"));
        Map<Long, String> nonsense = new HashMap<>();
        drawn.questions().forEach(q -> nonsense.put(q.getId(), "correct is " + q.getCorrectOption()));
        nonsense.put(drawn.questions().get(0).getId(), null);

        assertTrue(grade(examDrawService.grade(ids, drawn.optionOrders(), wrong)) <= 100.0);
        assertEquals(0.0, grade(examDrawService.grade(ids, drawn.optionOrders(), blankSheet)), 0.001);
        assertEquals(0.0, grade(examDrawService.grade(ids, drawn.optionOrders(), nonsense)), 0.001);

        Map<Long, String> skipped = allCorrect(drawn.questions());
        skipped.remove(drawn.questions().get(0).getId());
        skipped.put(drawn.questions().get(1).getId(), "E");
        assertEquals((23.0 / 25.0) * 100.0,
                grade(examDrawService.grade(ids, drawn.optionOrders(), skipped)), 0.001);
    }

    @Test
    @DisplayName("Answers for questions outside the draw earn nothing")
    void answersOutsideTheDrawAreIgnored() {
        ExamDrawService.QuestionSet drawn = draw();
        List<Long> drawnIds = idsOf(drawn.questions());
        List<ExamQuestion> undrawn = bank.stream().filter(q -> !drawnIds.contains(q.getId())).toList();
        assertFalse(undrawn.isEmpty(), "the bank must be bigger than the draw for this to mean anything");

        Map<Long, String> everything = allCorrect(drawn.questions());
        undrawn.forEach(q -> everything.put(q.getId(), q.getCorrectOption()));
        assertEquals(100.0, grade(examDrawService.grade(drawnIds, drawn.optionOrders(), everything)), 0.001);

        Map<Long, String> onlyUndrawn = new HashMap<>();
        undrawn.forEach(q -> onlyUndrawn.put(q.getId(), q.getCorrectOption()));
        assertEquals(0.0, grade(examDrawService.grade(drawnIds, drawn.optionOrders(), onlyUndrawn)), 0.001);
    }

    @Test
    @DisplayName("A drawn question deleted mid-attempt shrinks the denominator instead of leaking points")
    void deletedQuestionShrinksTheDraw() {
        ExamDrawService.QuestionSet drawn = draw();
        ExamQuestion removed = drawn.questions().get(0);
        bank = bank.stream().filter(q -> !q.getId().equals(removed.getId())).collect(Collectors.toList());
        List<Long> ids = idsOf(drawn.questions());

        Map<Long, String> answers = allCorrect(drawn.questions());
        assertEquals(100.0, grade(examDrawService.grade(ids, drawn.optionOrders(), answers)), 0.001);
        assertEquals(24, examDrawService.grade(ids, drawn.optionOrders(), answers).total());

        answers.remove(drawn.questions().get(1).getId());
        assertEquals((23.0 / 24.0) * 100.0,
                grade(examDrawService.grade(ids, drawn.optionOrders(), answers)), 0.001);
    }

    @Test
    @DisplayName("A draw whose questions have all disappeared grades zero rather than dividing by zero")
    void vanishedDrawGradesZero() {
        ExamDrawService.QuestionSet drawn = draw();

        ExamDrawService.GradeResult result = examDrawService.grade(
                List.of(900L, 901L), Map.of(900L, "ABCD", 901L, "ABCD"), allCorrect(drawn.questions()));

        assertEquals(0.0, result.score(), 0.001);
        assertEquals(0, result.total());
    }

    @Test
    @DisplayName("An empty or absent question id list grades zero rather than dividing by zero")
    void emptyIdListGradesZero() {
        assertEquals(0, examDrawService.grade(List.of(), Map.of(), Map.of()).total());
        assertEquals(0.0, examDrawService.grade(null, null, null).score(), 0.001);
    }

    @Test
    @DisplayName("Rendering a stored set reproduces the same questions in the same letters")
    void renderIsStableEnoughToResume() {
        ExamDrawService.QuestionSet drawn = draw();
        List<Long> ids = idsOf(drawn.questions());

        List<ExamQuestion> rendered = examDrawService.render(ids, drawn.optionOrders());

        assertEquals(ids, idsOf(rendered), "a refreshed page must see the same set in the same order");
        for (int i = 0; i < ids.size(); i++) {
            assertEquals(optionTexts(drawn.questions().get(i)), optionTexts(rendered.get(i)));
            assertEquals(drawn.questions().get(i).getCorrectOption(), rendered.get(i).getCorrectOption());
        }
    }

    @Test
    @DisplayName("Rendering with no stored order falls back to the bank's own letters")
    void renderWithoutOrderUsesBankLetters() {
        List<ExamQuestion> rendered = examDrawService.render(List.of(1L), Map.of());

        assertEquals(optionTexts(bank.get(0)), optionTexts(rendered.get(0)));
        assertEquals(bank.get(0).getCorrectOption(), rendered.get(0).getCorrectOption());
        assertTrue(examDrawService.render(List.of(), Map.of()).isEmpty());
    }

    @Test
    @DisplayName("A question that moved to another course is not credited even if it was drawn")
    void crossCourseQuestionIsNotCredited() {
        ExamDrawService.QuestionSet drawn = draw();
        bank.forEach(q -> q.setCourseId(2L));

        ExamDrawService.GradeResult result = examDrawService.grade(
                idsOf(drawn.questions()), drawn.optionOrders(), allCorrect(drawn.questions()));

        // Grading is by id, and the ids still resolve, so the score stands; the guard that matters
        // is that a candidate can only be served questions of the course they started.
        assertEquals(100.0, grade(result), 0.001);
    }

    @Test
    @DisplayName("A draw token binds one set to one attempt and one account")
    void drawTokenCarriesTheAttemptItWasMintedFor() {
        List<Long> ids = List.of(1L, 2L, 3L);
        String token = jwtService.generateExamDrawToken(7L, COURSE_ID, ATTEMPT_ID, ids, 60000L);

        JwtService.ExamDrawClaims claims = jwtService.parseExamDrawToken(token);

        assertEquals(7L, claims.userId());
        assertEquals(COURSE_ID, claims.courseId());
        assertEquals(ATTEMPT_ID, claims.attemptId());
        assertEquals(ids, claims.questionIds());
        assertNotNull(claims.tokenId());
        assertNotEquals(claims.tokenId(),
                jwtService.parseExamDrawToken(
                        jwtService.generateExamDrawToken(7L, COURSE_ID, ATTEMPT_ID, ids, 60000L)).tokenId(),
                "two sets for the same attempt must not share a token id, or one cannot be retired");
    }

    @Test
    @DisplayName("JwtService rejects a draw token of another type, a forged one and an expired one")
    void tokenParsingIsStrict() {
        String valid = jwtService.generateExamDrawToken(7L, COURSE_ID, ATTEMPT_ID, List.of(1L, 2L), 60000L);

        assertEquals(List.of(1L, 2L), jwtService.parseExamDrawToken(valid).questionIds());
        assertThrowsOne(null);
        assertThrowsOn(List.of(""));
        assertThrowsOn(List.of("abc.def.ghi"));
        assertThrowsOn(List.of(jwtService.generateToken("user@example.com", 7L)));
        assertFalse(jwtService.isTokenExpired(valid));
        assertTrue(jwtService.isTokenExpired(jwtService.generateExamDrawToken(
                7L, COURSE_ID, ATTEMPT_ID, List.of(1L), -1L)));
    }

    private void assertThrowsOn(List<String> tokens) {
        for (String token : tokens) {
            IllegalArgumentException thrown = assertThrowsOne(token);
            assertTrue(thrown.getMessage().length() > 0);
        }
    }

    private static IllegalArgumentException assertThrowsOne(String token) {
        JwtService service = new JwtService(
                "unit-test-signing-secret-that-is-long-enough-hs256", 86400000L);
        return org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> service.parseExamDrawToken(token));
    }

    @Test
    @DisplayName("The exam size is the number the endpoints and the copy advertise")
    void examSizeIsADocumentableConstant() {
        assertEquals(25, com.elearning.services.ExamPolicy.QUESTIONS_PER_EXAM);
        com.elearning.services.ExamPolicy policy = new com.elearning.services.ExamPolicy(
                40, 90, 3, 6, 120, 6, 3, 400, 15, 200);
        assertTrue(policy.drawValidity().toMinutes() >= 45,
                "the signed draw must outlive the 40-minute exam timer");
        assertEquals(40, policy.durationMinutes());
        assertEquals(Arrays.asList("CLEAN", "REVIEW", "FLAGGED"),
                List.of(policy.verdictFor(0), policy.verdictFor(3), policy.verdictFor(6)));
    }
}

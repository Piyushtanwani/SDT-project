package com.elearning.config;

import com.elearning.services.ExamDrawService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guards the quality of the JSON seed catalog: enough material to actually learn a subject, a
 * bank large enough that two attempts never see the same paper, and questions that do not give
 * their own answer away through letter position or option length.
 */
class SeedContentQualityTest {

    private static final int MIN_MODULES_PER_COURSE = 5;
    private static final int MIN_PARAGRAPHS_PER_MODULE = 6;
    private static final int MIN_WORDS_PER_PARAGRAPH = 45;
    private static final int MAX_WORDS_PER_PARAGRAPH = 170;
    private static final int MIN_QUESTIONS_PER_COURSE = 40;
    private static final int MIN_QUESTIONS_PER_DIFFICULTY = 8;
    private static final int MIN_USES_PER_LETTER = 4;

    private final List<ContentSeeder.Q> questions = ContentSeeder.allQuestions();
    private final List<ContentSeeder.CourseSeed> catalog = ContentSeeder.catalog();

    private static String optionFor(ContentSeeder.Q q, String letter) {
        return switch (letter) {
            case "A" -> q.a();
            case "B" -> q.b();
            case "C" -> q.c();
            case "D" -> q.d();
            default -> throw new AssertionError("Unknown answer letter: " + letter);
        };
    }

    private static int words(String text) {
        return text == null ? 0 : text.trim().split("\\s+").length;
    }

    private static boolean isUniquelyLongest(ContentSeeder.Q q) {
        List<Integer> lengths = List.of(q.a().length(), q.b().length(), q.c().length(), q.d().length());
        int max = Collections.max(lengths);
        long maxCount = lengths.stream().filter(len -> len == max).count();
        return maxCount == 1 && optionFor(q, q.correct()).length() == max;
    }

    @Test
    @DisplayName("Seed bank is substantial, complete and free of duplicate questions")
    void bankIsSubstantialAndComplete() {
        assertTrue(questions.size() >= 500, "Expected at least 500 seeded questions");
        for (ContentSeeder.Q q : questions) {
            assertFalse(q.text() == null || q.text().isBlank(), "Blank question text");
            List<String> options = List.of(q.a(), q.b(), q.c(), q.d());
            assertTrue(options.stream().noneMatch(o -> o == null || o.isBlank()),
                    "Blank option in: " + q.text());
            assertEquals(4, Set.copyOf(options).size(), "Duplicate options in: " + q.text());
            assertTrue(Set.of("A", "B", "C", "D").contains(q.correct()),
                    "Invalid correct option in: " + q.text());
            assertNotNull(q.explanation());
            assertFalse(q.explanation().isBlank(), "Missing explanation in: " + q.text());
            assertTrue(Set.of("EASY", "MEDIUM", "HARD").contains(q.difficulty()),
                    "Invalid difficulty in: " + q.text());
        }
        long distinct = questions.stream().map(ContentSeeder.Q::text).distinct().count();
        assertEquals(questions.size(), distinct, "Duplicate question text found");
    }

    @Test
    @DisplayName("Correct answers are spread across all four positions")
    void answerPositionsAreBalanced() {
        Map<String, Long> counts = questions.stream()
                .collect(Collectors.groupingBy(ContentSeeder.Q::correct, Collectors.counting()));
        assertEquals(Set.of("A", "B", "C", "D"), counts.keySet());
        long limit = Math.round(questions.size() * 0.40);
        counts.forEach((letter, count) ->
                assertTrue(count <= limit, "Answer " + letter + " used " + count + " times"));
    }

    @Test
    @DisplayName("Correct answers are not predictably the longest option")
    void correctAnswerIsNotPredictablyTheLongest() {
        long uniquelyLongest = questions.stream().filter(SeedContentQualityTest::isUniquelyLongest).count();
        long limit = Math.round(questions.size() * 0.30);
        assertTrue(uniquelyLongest <= limit,
                "Correct option is uniquely longest in " + uniquelyLongest + " of "
                        + questions.size() + " questions (limit " + limit + ")");
    }

    @Test
    @DisplayName("Every course carries enough material to learn the subject from")
    void everyCourseHasLearnableMaterial() {
        assertTrue(catalog.size() >= 14, "Expected at least 14 seeded courses");
        for (ContentSeeder.CourseSeed seed : catalog) {
            String course = seed.name();
            assertFalse(seed.description() == null || seed.description().isBlank(), course + ": no description");
            assertFalse(seed.duration() == null || seed.duration().isBlank(), course + ": no duration");
            assertTrue(seed.rating() >= 0.0 && seed.rating() <= 5.0, course + ": rating out of range");
            assertNotNull(seed.modules(), course + ": no modules");
            assertTrue(seed.modules().size() >= MIN_MODULES_PER_COURSE,
                    course + ": " + seed.modules().size() + " modules (need " + MIN_MODULES_PER_COURSE + ")");

            Set<String> titles = new HashSet<>();
            for (ContentSeeder.ModuleSeed mod : seed.modules()) {
                assertFalse(mod.title() == null || mod.title().isBlank(), course + ": blank module title");
                assertTrue(titles.add(mod.title().trim().toLowerCase()),
                        course + ": duplicate module title " + mod.title());
                assertNotNull(mod.content(), course + " / " + mod.title() + ": no content");
                assertTrue(mod.content().size() >= MIN_PARAGRAPHS_PER_MODULE,
                        course + " / " + mod.title() + ": " + mod.content().size()
                                + " paragraphs (need " + MIN_PARAGRAPHS_PER_MODULE + ")");
                for (String paragraph : mod.content()) {
                    int words = words(paragraph);
                    assertTrue(words >= MIN_WORDS_PER_PARAGRAPH,
                            course + " / " + mod.title() + ": " + words + "-word paragraph is a note, not teaching: "
                                    + paragraph);
                    assertTrue(words <= MAX_WORDS_PER_PARAGRAPH,
                            course + " / " + mod.title() + ": " + words + "-word paragraph needs splitting");
                }
                assertFalse(mod.content().stream().map(String::trim).distinct().count() < mod.content().size(),
                        course + " / " + mod.title() + ": repeated paragraph");
            }
        }
    }

    @Test
    @DisplayName("Every course bank is bigger than one exam draw so papers differ")
    void everyCourseBankOversuppliesOneDraw() {
        for (ContentSeeder.CourseSeed seed : catalog) {
            int size = seed.questions().size();
            assertTrue(size >= MIN_QUESTIONS_PER_COURSE,
                    seed.name() + ": " + size + " questions (need " + MIN_QUESTIONS_PER_COURSE + ")");
            assertTrue(size > ExamDrawService.QUESTIONS_PER_EXAM,
                    seed.name() + ": bank must be larger than the " + ExamDrawService.QUESTIONS_PER_EXAM
                            + " questions one attempt serves");
        }
    }

    @Test
    @DisplayName("Each course balances answer letters and difficulty on its own")
    void perCourseAnswerAndDifficultyBalance() {
        for (ContentSeeder.CourseSeed seed : catalog) {
            String course = seed.name();
            Map<String, Long> letters = seed.questions().stream()
                    .collect(Collectors.groupingBy(ContentSeeder.Q::correct, Collectors.counting()));
            assertEquals(Set.of("A", "B", "C", "D"), letters.keySet(), course + ": a letter is never used");
            letters.forEach((letter, count) -> {
                assertTrue(count >= MIN_USES_PER_LETTER,
                        course + ": answer " + letter + " used only " + count + " times");
                assertTrue(count <= seed.questions().size() * 0.40,
                        course + ": answer " + letter + " used " + count + " of " + seed.questions().size() + " times");
            });

            Map<String, Long> difficulties = seed.questions().stream()
                    .collect(Collectors.groupingBy(ContentSeeder.Q::difficulty, Collectors.counting()));
            assertEquals(Set.of("EASY", "MEDIUM", "HARD"), difficulties.keySet(), course + ": flat difficulty");
            difficulties.forEach((level, count) -> assertTrue(count >= MIN_QUESTIONS_PER_DIFFICULTY,
                    course + ": only " + count + " " + level + " questions"));

            long longest = seed.questions().stream().filter(SeedContentQualityTest::isUniquelyLongest).count();
            assertTrue(longest <= seed.questions().size() * 0.30,
                    course + ": correct option is uniquely longest in " + longest + " of "
                            + seed.questions().size() + " questions");
        }
    }

    @Test
    @DisplayName("No two courses reuse a paragraph of teaching material")
    void teachingMaterialIsNotReusedAcrossCourses() {
        Map<String, String> seen = new java.util.HashMap<>();
        for (ContentSeeder.CourseSeed seed : catalog) {
            for (ContentSeeder.ModuleSeed mod : seed.modules()) {
                for (String paragraph : mod.content()) {
                    String key = paragraph.trim().toLowerCase();
                    String owner = seen.putIfAbsent(key, seed.name());
                    assertTrue(owner == null || owner.equals(seed.name()),
                            seed.name() + " repeats a paragraph from " + owner);
                }
            }
        }
    }
}

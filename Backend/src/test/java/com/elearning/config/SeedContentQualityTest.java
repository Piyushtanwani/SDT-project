package com.elearning.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SeedContentQualityTest {

    private final List<ContentSeeder.Q> questions = ContentSeeder.allQuestions();

    private static String optionFor(ContentSeeder.Q q, String letter) {
        return switch (letter) {
            case "A" -> q.a();
            case "B" -> q.b();
            case "C" -> q.c();
            case "D" -> q.d();
            default -> throw new AssertionError("Unknown answer letter: " + letter);
        };
    }

    @Test
    @DisplayName("Seed bank is substantial, complete and free of duplicate questions")
    void bankIsSubstantialAndComplete() {
        assertTrue(questions.size() >= 120, "Expected at least 120 seeded questions");
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
        long uniquelyLongest = questions.stream().filter(q -> {
            List<Integer> lengths = List.of(q.a().length(), q.b().length(), q.c().length(), q.d().length());
            int max = Collections.max(lengths);
            long maxCount = lengths.stream().filter(len -> len == max).count();
            return maxCount == 1 && optionFor(q, q.correct()).length() == max;
        }).count();
        long limit = Math.round(questions.size() * 0.30);
        assertTrue(uniquelyLongest <= limit,
                "Correct option is uniquely longest in " + uniquelyLongest + " of "
                        + questions.size() + " questions (limit " + limit + ")");
    }
}

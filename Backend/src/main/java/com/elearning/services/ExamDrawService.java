package com.elearning.services;

import com.elearning.models.ExamQuestion;
import com.elearning.repositories.ExamQuestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Chooses an exam's question set and grades a submission against it.
 *
 * Two things make a leaked answer sheet nearly worthless here. Each attempt draws a different
 * subset of a much larger bank, and the four options of every drawn question are re-lettered for
 * that attempt only, so "question 7 is B" means something different on the next candidate's
 * screen. The re-lettering is returned alongside the questions so grading can undo it.
 *
 * This class holds no state and touches no clock, which is what lets the lifecycle rules in
 * {@link ExamSessionService} be tested separately from the arithmetic.
 */
@Service
public class ExamDrawService {

    private static final Logger log = LoggerFactory.getLogger(ExamDrawService.class);

    private static final String CANONICAL_LETTERS = "ABCD";

    private final ExamQuestionRepository examQuestionRepository;
    private final SecureRandom random = new SecureRandom();

    public ExamDrawService(ExamQuestionRepository examQuestionRepository) {
        this.examQuestionRepository = examQuestionRepository;
    }

    /**
     * @param questions    detached copies safe to serialize; their options are already re-lettered
     * @param optionOrders question id to the four canonical letters, in the order they are shown.
     *                     Slot A of the served question shows {@code orders.get(id).charAt(0)}.
     */
    public record QuestionSet(List<ExamQuestion> questions, Map<Long, String> optionOrders) {
    }

    /**
     * @param total drawn questions that still exist in the bank; the score denominator
     */
    public record GradeResult(int correct, int total, double score) {
    }

    /**
     * Draws {@code count} questions from the course bank and re-letters each one's options.
     *
     * @return an empty set when the course has no questions or a non-positive count was asked for.
     */
    public QuestionSet draw(Long courseId, int count) {
        List<ExamQuestion> bank = new ArrayList<>(examQuestionRepository.findByCourseId(courseId));
        if (bank.isEmpty() || count <= 0) {
            return new QuestionSet(List.of(), Map.of());
        }
        Collections.shuffle(bank, random);
        List<ExamQuestion> chosen = bank.subList(0, Math.min(count, bank.size()));

        List<ExamQuestion> served = new ArrayList<>(chosen.size());
        Map<Long, String> orders = new HashMap<>();
        for (ExamQuestion question : chosen) {
            int[] permutation = permutation();
            served.add(relettered(question, permutation));
            orders.put(question.getId(), lettersOf(permutation));
        }
        return new QuestionSet(List.copyOf(served), Map.copyOf(orders));
    }

    /**
     * Rebuilds the exact question set a stored attempt was shown, in the same letters, so a
     * refreshed page resumes instead of being handed a different exam.
     */
    public List<ExamQuestion> render(List<Long> drawnIds, Map<Long, String> optionOrders) {
        if (drawnIds == null || drawnIds.isEmpty()) {
            return List.of();
        }
        Map<Long, ExamQuestion> byId = new HashMap<>();
        for (ExamQuestion question : examQuestionRepository.findAllById(new LinkedHashSet<>(drawnIds))) {
            byId.putIfAbsent(question.getId(), question);
        }
        List<ExamQuestion> served = new ArrayList<>(drawnIds.size());
        for (Long id : drawnIds) {
            ExamQuestion source = byId.get(id);
            if (source == null) {
                continue; // Retired from the bank after it was served.
            }
            served.add(relettered(source, permutationOf(optionOrders == null ? null : optionOrders.get(id))));
        }
        return List.copyOf(served);
    }

    /**
     * Rebuilds a served set from stored question ids and their stored letter orders, for grading a
     * submission or an expired session long after the draw happened.
     *
     * Questions deleted from the bank since they were served drop out of the denominator rather
     * than being counted against the candidate.
     */
    public GradeResult grade(List<Long> drawnIds, Map<Long, String> optionOrders, Map<Long, String> answers) {
        Set<Long> drawn = new LinkedHashSet<>(drawnIds == null ? List.of() : drawnIds);
        if (drawn.isEmpty()) {
            return new GradeResult(0, 0, 0.0);
        }
        Map<Long, ExamQuestion> byId = new HashMap<>();
        for (ExamQuestion question : examQuestionRepository.findAllById(drawn)) {
            byId.putIfAbsent(question.getId(), question);
        }
        if (byId.size() < drawn.size()) {
            log.warn("{} of {} drawn questions no longer exist in the bank; grading on what remains.",
                    drawn.size() - byId.size(), drawn.size());
        }
        if (byId.isEmpty()) {
            return new GradeResult(0, 0, 0.0);
        }

        int correct = 0;
        if (answers != null) {
            for (Map.Entry<Long, String> entry : answers.entrySet()) {
                ExamQuestion question = byId.get(entry.getKey());
                if (question == null || question.getCorrectOption() == null) {
                    continue; // Answer for a question this attempt was never served.
                }
                if (isCorrect(question, optionOrders.get(entry.getKey()), entry.getValue())) {
                    correct++;
                }
            }
        }

        int total = byId.size();
        double score = ((double) correct / total) * 100.0;
        if (Double.isNaN(score) || Double.isInfinite(score) || score < 0.0) {
            score = 0.0;
        }
        return new GradeResult(correct, total, Math.min(100.0, score));
    }

    /** Undoes this attempt's re-lettering before comparing with the stored answer key. */
    private boolean isCorrect(ExamQuestion question, String order, String given) {
        if (given == null) {
            return false;
        }
        String displayed = given.trim().toUpperCase();
        if (displayed.length() != 1) {
            return false;
        }
        int slot = CANONICAL_LETTERS.indexOf(displayed.charAt(0));
        if (slot < 0) {
            return false; // 'E' marks an unanswered question, and anything else is not a letter.
        }
        String canonical = (order == null || order.length() != 4)
                ? CANONICAL_LETTERS
                : order;
        return question.getCorrectOption().trim().equalsIgnoreCase(String.valueOf(canonical.charAt(slot)));
    }

    private int[] permutation() {
        int[] indexes = {0, 1, 2, 3};
        for (int i = indexes.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            int swap = indexes[i];
            indexes[i] = indexes[j];
            indexes[j] = swap;
        }
        return indexes;
    }

    /** The stored letter order read back as slot indexes, falling back to the bank's own order. */
    private int[] permutationOf(String order) {
        if (order == null || order.length() != 4) {
            return new int[]{0, 1, 2, 3};
        }
        String upper = order.toUpperCase(Locale.ROOT);
        int[] indexes = new int[4];
        for (int slot = 0; slot < 4; slot++) {
            int index = CANONICAL_LETTERS.indexOf(upper.charAt(slot));
            if (index < 0) {
                return new int[]{0, 1, 2, 3};
            }
            indexes[slot] = index;
        }
        return indexes;
    }

    private String lettersOf(int[] permutation) {
        StringBuilder builder = new StringBuilder(4);
        for (int index : permutation) {
            builder.append(CANONICAL_LETTERS.charAt(index));
        }
        return builder.toString();
    }

    /**
     * A detached copy of a bank question whose options sit in the attempt's order. The answer key
     * is moved to the letter the candidate now sees, so the object stays self-consistent even
     * though {@code correctOption} is never serialized.
     */
    private ExamQuestion relettered(ExamQuestion source, int[] permutation) {
        String[] texts = {source.getOptionA(), source.getOptionB(), source.getOptionC(), source.getOptionD()};
        ExamQuestion copy = new ExamQuestion();
        copy.setId(source.getId());
        copy.setCourseId(source.getCourseId());
        copy.setQuestionText(source.getQuestionText());
        copy.setDifficulty(source.getDifficulty());
        copy.setCreatedAt(source.getCreatedAt());
        copy.setOptionA(texts[permutation[0]]);
        copy.setOptionB(texts[permutation[1]]);
        copy.setOptionC(texts[permutation[2]]);
        copy.setOptionD(texts[permutation[3]]);
        int correctIndex = CANONICAL_LETTERS.indexOf(
                source.getCorrectOption() == null ? "" : source.getCorrectOption().trim().toUpperCase());
        if (correctIndex >= 0) {
            for (int slot = 0; slot < 4; slot++) {
                if (permutation[slot] == correctIndex) {
                    copy.setCorrectOption(String.valueOf(CANONICAL_LETTERS.charAt(slot)));
                    break;
                }
            }
        }
        return copy;
    }
}

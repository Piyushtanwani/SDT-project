package com.elearning.services;

import com.elearning.models.ExamQuestion;
import com.elearning.repositories.ExamQuestionRepository;
import com.elearning.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Owns one exam attempt's question draw and its grading.
 *
 * A course bank holds far more questions than a single attempt needs, so every attempt draws a
 * different subset. The ids served are signed and handed back to the client, which must present
 * them again on submit: that keeps the score denominator equal to what was actually served and
 * makes it impossible to be credited for questions the candidate never saw.
 */
@Service
public class ExamDrawService {

    private static final Logger log = LoggerFactory.getLogger(ExamDrawService.class);

    /** Questions served per attempt; the course bank is expected to be larger than this. */
    public static final int QUESTIONS_PER_EXAM = 25;

    /** A 40-minute exam plus slack for a slow connection or a late submit. */
    public static final Duration DRAW_VALIDITY = Duration.ofMinutes(60);

    private final ExamQuestionRepository examQuestionRepository;
    private final JwtService jwtService;

    public ExamDrawService(ExamQuestionRepository examQuestionRepository, JwtService jwtService) {
        this.examQuestionRepository = examQuestionRepository;
        this.jwtService = jwtService;
    }

    public record ExamDraw(List<ExamQuestion> questions, String drawToken, Instant expiresAt) {
    }

    public ExamDraw issueDraw(Long courseId, Long userId, int count) {
        List<ExamQuestion> bank = new ArrayList<>(examQuestionRepository.findByCourseId(courseId));
        if (bank.isEmpty() || count <= 0) {
            return new ExamDraw(List.of(), null, null);
        }
        Collections.shuffle(bank);
        List<ExamQuestion> drawn = List.copyOf(bank.subList(0, Math.min(count, bank.size())));
        List<Long> ids = drawn.stream().map(ExamQuestion::getId).toList();
        String token = jwtService.generateExamDrawToken(userId, courseId, ids, DRAW_VALIDITY.toMillis());
        return new ExamDraw(drawn, token, Instant.now().plus(DRAW_VALIDITY));
    }

    /**
     * Grades the attempt against its signed draw.
     *
     * @throws IllegalArgumentException when the token is forged, expired, belongs to another user
     *                                  or course, or no longer resolves to servable questions.
     */
    public double grade(Long userId, Long courseId, String drawToken, Map<Long, String> answers) {
        JwtService.ExamDrawClaims claims = jwtService.parseExamDrawToken(drawToken);
        if (!claims.userId().equals(userId)) {
            throw new IllegalArgumentException("This exam draw belongs to another account.");
        }
        if (!claims.courseId().equals(courseId)) {
            throw new IllegalArgumentException("This exam draw belongs to another course.");
        }

        Set<Long> drawnIds = new LinkedHashSet<>(claims.questionIds());
        List<ExamQuestion> drawn = new ArrayList<>();
        for (ExamQuestion question : examQuestionRepository.findAllById(drawnIds)) {
            if (courseId.equals(question.getCourseId())) {
                drawn.add(question);
            }
        }
        if (drawn.size() < drawnIds.size()) {
            log.warn("Course {} draw had {} of {} questions removed since they were served; grading on what remains.",
                    courseId, drawnIds.size() - drawn.size(), drawnIds.size());
        }
        if (drawn.isEmpty()) {
            return 0.0;
        }

        Map<Long, ExamQuestion> byId = new HashMap<>();
        for (ExamQuestion question : drawn) {
            byId.putIfAbsent(question.getId(), question);
        }

        long correct = 0;
        if (answers != null) {
            for (Map.Entry<Long, String> entry : answers.entrySet()) {
                ExamQuestion question = byId.get(entry.getKey());
                if (question == null || question.getCorrectOption() == null) {
                    continue; // Answer for a question this attempt was never served.
                }
                String given = entry.getValue() == null ? "" : entry.getValue().trim();
                if (question.getCorrectOption().trim().equalsIgnoreCase(given)) {
                    correct++;
                }
            }
        }

        double score = ((double) correct / drawn.size()) * 100.0;
        if (Double.isNaN(score) || Double.isInfinite(score) || score < 0.0) {
            return 0.0;
        }
        return Math.min(100.0, score);
    }
}

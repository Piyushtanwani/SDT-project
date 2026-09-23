package com.elearning.services;

import org.springframework.stereotype.Service;

import com.elearning.models.ExamQuestion;
import com.elearning.repositories.ExamQuestionRepository;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ExamQuestionService {

    private final ExamQuestionRepository examQuestionRepository;

    public ExamQuestionService(ExamQuestionRepository examQuestionRepository) {
        this.examQuestionRepository = examQuestionRepository;
    }

    public List<ExamQuestion> getQuestionsByCourse(Long courseId) {
        return examQuestionRepository.findByCourseId(courseId);
    }

    public ExamQuestion addQuestion(ExamQuestion question) {
        return examQuestionRepository.save(question);
}
    
    public void addQuestions(List<ExamQuestion> question) {
        examQuestionRepository.saveAll(question);
    }
    public List<ExamQuestion> getRandomQuestions(Long courseId, int count) {
        List<ExamQuestion> questions = examQuestionRepository.findByCourseId(courseId);
        Collections.shuffle(questions);
        return questions.stream().limit(count).collect(Collectors.toList());
    }

    public double evaluateExam(Map<Long, String> answers) {
        if (answers == null || answers.isEmpty()) {
            return 0.0;
        }
        Long firstQId = answers.keySet().iterator().next();
        ExamQuestion q = examQuestionRepository.findById(firstQId).orElse(null);
        if (q != null) {
            return evaluateExam(q.getCourseId(), answers);
        }
        return 0.0;
    }

    public double evaluateExam(Long courseId, Map<Long, String> answers) {
        if (courseId == null) {
            return evaluateExam(answers);
        }
        List<ExamQuestion> courseQuestions = examQuestionRepository.findByCourseId(courseId);
        if (courseQuestions == null || courseQuestions.isEmpty()) {
            return 0.0;
        }
        int totalQuestions = Math.min(50, courseQuestions.size());
        if (totalQuestions <= 0) {
            return 0.0;
        }

        if (answers == null || answers.isEmpty()) {
            return 0.0;
        }

        Map<Long, ExamQuestion> questionMap = courseQuestions.stream()
                .collect(Collectors.toMap(ExamQuestion::getId, qu -> qu, (a, b) -> a));

        long correctAnswers = 0;
        for (Map.Entry<Long, String> entry : answers.entrySet()) {
            ExamQuestion question = questionMap.get(entry.getKey());
            if (question != null && question.getCorrectOption() != null) {
                if (question.getCorrectOption().trim().equalsIgnoreCase(entry.getValue() != null ? entry.getValue().trim() : "")) {
                    correctAnswers++;
                }
            }
        }

        double score = ((double) correctAnswers / totalQuestions) * 100.0;
        if (Double.isNaN(score) || Double.isInfinite(score) || score < 0.0) {
            return 0.0;
        }
        return Math.min(100.0, score);
    }
}

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
        int totalQuestions = answers.size();
        long correctAnswers = answers.entrySet().stream()
                .filter(entry -> {
                    ExamQuestion question = examQuestionRepository.findById(entry.getKey()).orElse(null);
                    return question != null && question.getCorrectOption().equals(entry.getValue());
                })
                .count();
        return ((double) correctAnswers / totalQuestions) * 100;
    }    
}

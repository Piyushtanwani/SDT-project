package com.elearning.services;

import org.springframework.stereotype.Service;

import com.elearning.models.ExamQuestion;
import com.elearning.repositories.ExamQuestionRepository;

import java.util.List;

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

    public void addQuestions(List<ExamQuestion> questions) {
        examQuestionRepository.saveAll(questions);
    }
}

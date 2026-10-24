package com.elearning.services;

import org.springframework.stereotype.Service;

import com.elearning.models.ExamAttempt;
import com.elearning.repositories.ExamAttemptRepository;

import java.util.List;
import java.util.Optional;

@Service
public class ExamAttemptService {

    private final ExamAttemptRepository examAttemptRepository;

    public Optional<ExamAttempt> getAttemptById(Long attemptId) {
        return examAttemptRepository.findById(attemptId);
    }
    
    public ExamAttemptService(ExamAttemptRepository examAttemptRepository) {
        this.examAttemptRepository = examAttemptRepository;
    }

    public List<ExamAttempt> getAttemptsByUser(Long userId) {
        return examAttemptRepository.findByUserId(userId);
    }

    public ExamAttempt saveAttempt(ExamAttempt attempt) {
        return examAttemptRepository.save(attempt);
    }
}

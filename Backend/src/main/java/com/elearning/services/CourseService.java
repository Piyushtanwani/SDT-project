package com.elearning.services;

import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.elearning.models.Course;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.repositories.ExamQuestionRepository;
import com.elearning.repositories.ModuleRepository;

@Service
public class CourseService {

    private final CourseRepository courseRepository;
    private final ModuleRepository moduleRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final CertificateRepository certificateRepository;

    public CourseService(CourseRepository courseRepository,
                         ModuleRepository moduleRepository,
                         ExamQuestionRepository examQuestionRepository,
                         ExamAttemptRepository examAttemptRepository,
                         CertificateRepository certificateRepository) {
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.examQuestionRepository = examQuestionRepository;
        this.examAttemptRepository = examAttemptRepository;
        this.certificateRepository = certificateRepository;
    }

    public void addCourse(Course course) {
        courseRepository.save(course);
    }

    public String getCourseName(Long id) {
        Course obj1 = courseRepository.getById(id);
        return obj1.getName();
    }

    public List<Course> getAllCourses() {
        List<Course> allcourses = courseRepository.findAll();
        return allcourses;
    }

    @Transactional
    public void deleteCourseById(Long id) {
        if (!courseRepository.existsById(id)) {
            throw new NoSuchElementException("Course Not Found");
        }
        if (!examAttemptRepository.findByCourseId(id).isEmpty()
                || certificateRepository.countByCourseId(id) > 0) {
            throw new IllegalStateException(
                    "This course has learner attempts or certificates and cannot be deleted.");
        }
        moduleRepository.deleteByCourseId(id);
        examQuestionRepository.deleteByCourseId(id);
        courseRepository.deleteById(id);
    }
}

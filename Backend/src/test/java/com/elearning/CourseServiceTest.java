package com.elearning;

import com.elearning.models.ExamAttempt;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.repositories.ExamQuestionRepository;
import com.elearning.repositories.ModuleRepository;
import com.elearning.services.CourseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private ModuleRepository moduleRepository;

    @Mock
    private ExamQuestionRepository examQuestionRepository;

    @Mock
    private ExamAttemptRepository examAttemptRepository;

    @Mock
    private CertificateRepository certificateRepository;

    private CourseService courseService;

    @BeforeEach
    void setUp() {
        courseService = new CourseService(
                courseRepository,
                moduleRepository,
                examQuestionRepository,
                examAttemptRepository,
                certificateRepository);
    }

    @Test
    @DisplayName("Deleting a course removes its modules and questions")
    void deletingCourseRemovesChildren() {
        when(courseRepository.existsById(3L)).thenReturn(true);
        when(examAttemptRepository.findByCourseId(3L)).thenReturn(List.of());
        when(certificateRepository.countByCourseId(3L)).thenReturn(0L);

        courseService.deleteCourseById(3L);

        verify(moduleRepository).deleteByCourseId(3L);
        verify(examQuestionRepository).deleteByCourseId(3L);
        verify(courseRepository).deleteById(3L);
    }

    @Test
    @DisplayName("A course with learner history cannot be deleted")
    void deletingCourseWithAttemptsIsRejected() {
        when(courseRepository.existsById(3L)).thenReturn(true);
        when(examAttemptRepository.findByCourseId(3L))
                .thenReturn(List.of(new ExamAttempt(1L, 2L, 3L, 85.0, true, LocalDateTime.now())));

        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> courseService.deleteCourseById(3L));

        assertTrue(error.getMessage().contains("cannot be deleted"));
        verify(moduleRepository, never()).deleteByCourseId(anyLong());
        verify(courseRepository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("A course with issued certificates cannot be deleted")
    void deletingCourseWithCertificatesIsRejected() {
        when(courseRepository.existsById(3L)).thenReturn(true);
        when(examAttemptRepository.findByCourseId(3L)).thenReturn(List.of());
        when(certificateRepository.countByCourseId(3L)).thenReturn(1L);

        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> courseService.deleteCourseById(3L));

        assertTrue(error.getMessage().contains("cannot be deleted"));
        verify(courseRepository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("Deleting a missing course reports not found")
    void deletingMissingCourseIsNotFound() {
        when(courseRepository.existsById(99L)).thenReturn(false);

        assertThrows(NoSuchElementException.class, () -> courseService.deleteCourseById(99L));

        verify(moduleRepository, never()).deleteByCourseId(anyLong());
        verify(courseRepository, never()).deleteById(anyLong());
    }
}

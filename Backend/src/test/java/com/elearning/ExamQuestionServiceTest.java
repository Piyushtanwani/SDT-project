package com.elearning;

import com.elearning.models.ExamQuestion;
import com.elearning.repositories.ExamQuestionRepository;
import com.elearning.services.ExamQuestionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExamQuestionServiceTest {

    @Mock
    private ExamQuestionRepository examQuestionRepository;

    @InjectMocks
    private ExamQuestionService examQuestionService;

    private Long courseId = 1L;
    private List<ExamQuestion> mockQuestions;

    @BeforeEach
    void setUp() {
        mockQuestions = new ArrayList<>();
        for (long i = 1; i <= 10; i++) {
            ExamQuestion q = new ExamQuestion();
            q.setId(i);
            q.setCourseId(courseId);
            q.setQuestionText("Question " + i);
            q.setOptionA("A");
            q.setOptionB("B");
            q.setOptionC("C");
            q.setOptionD("D");
            q.setCorrectOption("A");
            mockQuestions.add(q);
        }
    }

    @Test
    @DisplayName("BUG-02: 100% score when all questions answered correctly")
    void testEvaluateExam_AllCorrect() {
        when(examQuestionRepository.findByCourseId(courseId)).thenReturn(mockQuestions);

        Map<Long, String> answers = new HashMap<>();
        for (ExamQuestion q : mockQuestions) {
            answers.put(q.getId(), "A");
        }

        double score = examQuestionService.evaluateExam(courseId, answers);
        assertEquals(100.0, score, 0.001);
    }

    @Test
    @DisplayName("BUG-02: 0% score when all answers are incorrect")
    void testEvaluateExam_AllIncorrect() {
        when(examQuestionRepository.findByCourseId(courseId)).thenReturn(mockQuestions);

        Map<Long, String> answers = new HashMap<>();
        for (ExamQuestion q : mockQuestions) {
            answers.put(q.getId(), "B");
        }

        double score = examQuestionService.evaluateExam(courseId, answers);
        assertEquals(0.0, score, 0.001);
    }

    @Test
    @DisplayName("BUG-02: Partial score correctly evaluates against total questions, not submitted answers count")
    void testEvaluateExam_PartialAnswers_DoesNotInflateScore() {
        when(examQuestionRepository.findByCourseId(courseId)).thenReturn(mockQuestions);

        // Submit only 1 correct answer out of 10 questions.
        // Old bug: 1 / 1 = 100%. Fixed: 1 / 10 = 10.0%.
        Map<Long, String> answers = new HashMap<>();
        answers.put(1L, "A");

        double score = examQuestionService.evaluateExam(courseId, answers);
        assertEquals(10.0, score, 0.001);
    }

    @Test
    @DisplayName("BUG-02: Empty answers map returns 0.0 and does not return NaN or throw")
    void testEvaluateExam_EmptyAnswers() {
        when(examQuestionRepository.findByCourseId(courseId)).thenReturn(mockQuestions);

        double score = examQuestionService.evaluateExam(courseId, Collections.emptyMap());
        assertEquals(0.0, score, 0.001);
    }

    @Test
    @DisplayName("BUG-02: Null answers map returns 0.0 safely")
    void testEvaluateExam_NullAnswers() {
        double score = examQuestionService.evaluateExam(courseId, null);
        assertEquals(0.0, score, 0.001);
    }

    @Test
    @DisplayName("BUG-02: Empty question repository returns 0.0 safely without division by zero")
    void testEvaluateExam_CourseWithNoQuestions() {
        when(examQuestionRepository.findByCourseId(999L)).thenReturn(Collections.emptyList());

        Map<Long, String> answers = Map.of(1L, "A");
        double score = examQuestionService.evaluateExam(999L, answers);
        assertEquals(0.0, score, 0.001);
    }

    @Test
    @DisplayName("BUG-02: Ignores submitted answers for questions not belonging to the course")
    void testEvaluateExam_ForeignQuestionsIgnored() {
        when(examQuestionRepository.findByCourseId(courseId)).thenReturn(mockQuestions);

        Map<Long, String> answers = new HashMap<>();
        answers.put(9999L, "A"); // Does not exist in courseId 1

        double score = examQuestionService.evaluateExam(courseId, answers);
        assertEquals(0.0, score, 0.001);
    }
}

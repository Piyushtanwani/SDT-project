package com.elearning;

import com.elearning.models.Certificate;
import com.elearning.models.Course;
import com.elearning.models.Module;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ModuleRepository;
import com.elearning.services.AssistantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssistantServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private ModuleRepository moduleRepository;

    @Mock
    private CertificateRepository certificateRepository;

    @InjectMocks
    private AssistantService assistantService;

    private Course javaCourse;

    @BeforeEach
    void setUp() {
        javaCourse = new Course(1L, "Java", "Objects and the JVM", "6 weeks", null, 4.8);
    }

    @Test
    @DisplayName("Assistant reports the 80% passing rule")
    void passingScoreIsEightyPercent() {
        String reply = assistantService.answer("What is the passing score?");

        assertTrue(reply.contains("80%"));
        assertTrue(reply.toLowerCase().contains("server"));
    }

    @Test
    @DisplayName("Assistant lists courses from the database")
    void listsCoursesFromDatabase() {
        when(courseRepository.findAll()).thenReturn(List.of(javaCourse));

        String reply = assistantService.answer("list courses");

        assertTrue(reply.contains("Available courses (1)"));
        assertTrue(reply.contains("Java"));
        assertTrue(reply.contains("6 weeks"));
    }

    @Test
    @DisplayName("Assistant explains an empty catalog without failing")
    void handlesEmptyCatalog() {
        when(courseRepository.findAll()).thenReturn(List.of());

        String reply = assistantService.answer("show me the course catalog");

        assertTrue(reply.contains("No courses have been published"));
    }

    @Test
    @DisplayName("Assistant verifies a real credential without external AI")
    void verifiesCredential() {
        Certificate certificate = new Certificate(7L, 3L, 1L, 100.0,
                LocalDateTime.of(2026, 10, 30, 12, 0), "BC944370D1");
        when(certificateRepository.getByCredentialId("BC944370D1")).thenReturn(certificate);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(javaCourse));

        String reply = assistantService.answer("verify BC944370D1");

        assertTrue(reply.contains("BC944370D1 is valid"));
        assertTrue(reply.contains("Java"));
        assertTrue(reply.contains("100%"));
        assertTrue(reply.contains("30 Oct 2026"));
    }

    @Test
    @DisplayName("Assistant reports an unknown credential instead of guessing")
    void reportsUnknownCredential() {
        when(certificateRepository.getByCredentialId("BC00000000")).thenReturn(null);

        String reply = assistantService.answer("verify BC00000000");

        assertTrue(reply.contains("No certificate found"));
    }

    @Test
    @DisplayName("Assistant answers technical questions from the built-in knowledge base")
    void answersTechnicalKnowledge() {
        String reply = assistantService.answer("explain SQL joins");

        assertTrue(reply.contains("INNER JOIN"));
        assertTrue(reply.contains("LEFT JOIN"));
    }

    @Test
    @DisplayName("Assistant falls back to module content when no article matches")
    void searchesModuleContent() {
        Module module = new Module();
        module.setCourseId(1L);
        module.setModuleTitle("Quantum Computing Basics");
        module.setContent(List.of("Quantum entanglement links particles so their measured states correlate."));
        when(courseRepository.findAll()).thenReturn(List.of(javaCourse));
        when(moduleRepository.findAll()).thenReturn(List.of(module));

        String reply = assistantService.answer("what is quantum entanglement");

        assertTrue(reply.contains("Quantum Computing Basics"));
        assertTrue(reply.contains("entanglement links particles"));
    }

    @Test
    @DisplayName("Assistant returns the help menu for blank input and unknown questions")
    void blankInputReturnsHelp() {
        String reply = assistantService.answer("   ");

        assertTrue(reply.contains("SDT Learning Assistant"));
        assertTrue(reply.contains("list courses"));
    }

    @Test
    @DisplayName("Assistant fails gracefully on an unknown topic")
    void unknownTopicFallsBack() {
        when(courseRepository.findAll()).thenReturn(List.of());
        when(moduleRepository.findAll()).thenReturn(List.of());

        String reply = assistantService.answer("zorblax flux capacitor");

        assertTrue(reply.contains("did not find a specific answer"));
    }

    @Test
    @DisplayName("Assistant reports an empty leaderboard")
    void emptyLeaderboard() {
        when(certificateRepository.findTopAchievers()).thenReturn(List.of());

        String reply = assistantService.answer("show the leaderboard");

        assertTrue(reply.contains("leaderboard is empty"));
    }
}

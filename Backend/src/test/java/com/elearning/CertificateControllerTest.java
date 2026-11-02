package com.elearning;

import com.elearning.controller.CertificateController;
import com.elearning.models.Certificate;
import com.elearning.models.Course;
import com.elearning.models.ExamAttempt;
import com.elearning.models.Payment;
import com.elearning.models.User;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.repositories.PaymentRepository;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.CredentialVerificationDTO;
import com.elearning.services.CertificateService;
import com.elearning.services.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CertificateControllerTest {

    @Mock
    private CertificateRepository certificateRepository;

    @Mock
    private ExamAttemptRepository examAttemptRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private PaymentRepository paymentRepository;

    private CertificateController certificateController;
    private UserDetails alice;
    private User aliceUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        // A real ledger with no gateway keys, which is how the gate stays out of the way of the
        // tests below; the two fee tests swap in one that has keys.
        certificateController = controllerWith(new PaymentService(null, "", ""));
        alice = org.springframework.security.core.userdetails.User
                .withUsername("alice@example.com").password("x").authorities("ROLE_USER").build();
        aliceUser = user(1L, "alice@example.com", "USER");
        adminUser = user(9L, "admin@example.com", "ADMIN");
    }

    private CertificateController controllerWith(PaymentService payments) {
        return new CertificateController(
                new CertificateService(certificateRepository, examAttemptRepository, payments),
                userRepository, courseRepository);
    }

    /** The same ledger, but pointed at Razorpay test keys so the fee rule switches on. */
    private PaymentService gatewayOn() {
        return new PaymentService(paymentRepository, "rzp_test_key", "test-secret");
    }

    @Test
    @DisplayName("SEC-08: a learner cannot request a certificate for another user")
    void issueForAnotherUserIsForbidden() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(aliceUser));

        var response = certificateController.issueCertificate(2L, 1L, alice);

        assertEquals(HttpStatus.FORBIDDEN.value(), response.getStatusCode().value());
        verifyNoInteractions(certificateRepository, examAttemptRepository);
    }

    @Test
    @DisplayName("A learner can request their own certificate after a passing attempt")
    void issueForSelfSucceeds() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(aliceUser));
        when(certificateRepository.findByUserIdAndCourseId(1L, 1L)).thenReturn(List.of());
        when(examAttemptRepository.findByUserIdAndCourseId(1L, 1L))
                .thenReturn(List.of(attempt(1L, 1L, 90.0)));
        when(certificateRepository.getByCredentialId(anyString())).thenReturn(null);
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = certificateController.issueCertificate(1L, 1L, alice);

        assertEquals(HttpStatus.OK.value(), response.getStatusCode().value());
        Certificate issued = (Certificate) response.getBody();
        assertNotNull(issued);
        assertEquals(90.0, issued.getScore());
        assertTrue(issued.getCredentialId().startsWith("BC"));
    }

    @Test
    @DisplayName("RULE-05: with a gateway configured, an unpaid fee cannot buy a certificate")
    void issuanceWaitsForAVerifiedFee() {
        certificateController = controllerWith(gatewayOn());
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(aliceUser));
        when(certificateRepository.findByUserIdAndCourseId(1L, 1L)).thenReturn(List.of());
        when(examAttemptRepository.findByUserIdAndCourseId(1L, 1L))
                .thenReturn(List.of(attempt(1L, 1L, 95.0)));
        when(paymentRepository.findByUserIdAndStatusAndCertificateIdIsNull(1L, "SUCCESS"))
                .thenReturn(List.of());

        var response = certificateController.issueCertificate(1L, 1L, alice);

        assertEquals(HttpStatus.PAYMENT_REQUIRED.value(), response.getStatusCode().value());
        verify(certificateRepository, never()).save(any(Certificate.class));
    }

    @Test
    @DisplayName("RULE-05: a verified fee is spent by the credential it bought")
    void issuanceSpendsTheFeeItWasGatedOn() {
        certificateController = controllerWith(gatewayOn());
        Payment paid = new Payment();
        paid.setUserId(1L);
        paid.setAmount(50.0);
        paid.setStatus("SUCCESS");
        paid.setCreatedAt(LocalDateTime.now());
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(aliceUser));
        when(certificateRepository.findByUserIdAndCourseId(1L, 1L)).thenReturn(List.of());
        when(examAttemptRepository.findByUserIdAndCourseId(1L, 1L))
                .thenReturn(List.of(attempt(1L, 1L, 95.0)));
        when(paymentRepository.findByUserIdAndStatusAndCertificateIdIsNull(1L, "SUCCESS"))
                .thenReturn(List.of(paid));
        when(certificateRepository.getByCredentialId(anyString())).thenReturn(null);
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(invocation -> {
            Certificate saved = invocation.getArgument(0);
            saved.setId(77L);
            return saved;
        });

        var response = certificateController.issueCertificate(1L, 1L, alice);

        assertEquals(HttpStatus.OK.value(), response.getStatusCode().value());
        assertEquals(77L, paid.getCertificateId().longValue());
    }

    @Test
    @DisplayName("An admin can issue a certificate for any learner")
    void adminCanIssueForAnyone() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(adminUser));
        when(certificateRepository.findByUserIdAndCourseId(2L, 1L)).thenReturn(List.of());
        when(examAttemptRepository.findByUserIdAndCourseId(2L, 1L))
                .thenReturn(List.of(attempt(2L, 1L, 88.0)));
        when(certificateRepository.getByCredentialId(anyString())).thenReturn(null);
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = certificateController.issueCertificate(2L, 1L, alice);

        assertEquals(HttpStatus.OK.value(), response.getStatusCode().value());
    }

    @Test
    @DisplayName("SEC-08: a learner cannot read another user's certificates")
    void readingAnotherUsersCertificatesIsForbidden() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(aliceUser));

        var response = certificateController.getCertificatesByUser(2L, alice);

        assertEquals(HttpStatus.FORBIDDEN.value(), response.getStatusCode().value());
        verifyNoInteractions(certificateRepository);
    }

    @Test
    @DisplayName("Certificate requests without authentication are rejected")
    void unauthenticatedRequestIsRejected() {
        var response = certificateController.issueCertificate(1L, 1L, null);

        assertEquals(HttpStatus.UNAUTHORIZED.value(), response.getStatusCode().value());
        verifyNoInteractions(certificateRepository, examAttemptRepository);
    }

    @Test
    @DisplayName("A learner can list their own certificates")
    void readingOwnCertificatesSucceeds() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(aliceUser));
        when(certificateRepository.findByUserId(1L)).thenReturn(List.of());

        var response = certificateController.getCertificatesByUser(1L, alice);

        assertEquals(HttpStatus.OK.value(), response.getStatusCode().value());
    }

    @Test
    @DisplayName("Public credential verification resolves the holder and course without authentication")
    void publicCredentialLookupResolvesNames() {
        Certificate cert = new Certificate(null, 1L, 3L, 92.5, LocalDateTime.now(), "BC12345678");
        when(certificateRepository.getByCredentialId("BC12345678")).thenReturn(cert);
        User holder = user(1L, "alice@example.com", "USER");
        holder.setUsername("alice");
        when(userRepository.findById(1L)).thenReturn(Optional.of(holder));
        Course course = new Course();
        course.setId(3L);
        course.setName("Java");
        when(courseRepository.findById(3L)).thenReturn(Optional.of(course));

        var response = certificateController.getCertificateByCredentialId("BC12345678");

        assertEquals(HttpStatus.OK.value(), response.getStatusCode().value());
        CredentialVerificationDTO body = response.getBody();
        assertNotNull(body);
        assertEquals("BC12345678", body.getCredentialId());
        assertEquals("alice", body.getHolderName());
        assertEquals("Java", body.getCourseName());
        assertEquals(92.5, body.getScore());
    }

    @Test
    @DisplayName("Public credential verification returns 404 for an unknown credential")
    void publicCredentialLookupUnknownIdIsNotFound() {
        when(certificateRepository.getByCredentialId("BCNOPE0000")).thenReturn(null);

        var response = certificateController.getCertificateByCredentialId("BCNOPE0000");

        assertEquals(HttpStatus.NOT_FOUND.value(), response.getStatusCode().value());
    }

    private static ExamAttempt attempt(Long userId, Long courseId, double score) {
        ExamAttempt attempt = new ExamAttempt(null, userId, courseId, score, score >= 80, LocalDateTime.now());
        attempt.setStatus(ExamAttempt.STATUS_SUBMITTED);
        attempt.setIntegrity(ExamAttempt.INTEGRITY_CLEAN);
        return attempt;
    }

    private static User user(Long id, String email, String role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setRole(role);
        return user;
    }
}

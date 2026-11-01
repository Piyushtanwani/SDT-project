package com.elearning;

import com.elearning.models.Certificate;
import com.elearning.models.ExamAttempt;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.services.CertificateService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CertificateServiceTest {

    @Mock
    private CertificateRepository certificateRepository;

    @Mock
    private ExamAttemptRepository examAttemptRepository;

    @InjectMocks
    private CertificateService certificateService;

    private ExamAttempt attempt(long userId, long courseId, double score) {
        ExamAttempt a = new ExamAttempt();
        a.setUserId(userId);
        a.setCourseId(courseId);
        a.setScore(score);
        a.setPassed(score >= CertificateService.PASSING_SCORE);
        // Certificates are only earned from finished sittings, so a fixture that wants credit has
        // to say so; IN_PROGRESS is what a fresh attempt row starts life as.
        a.setStatus(ExamAttempt.STATUS_SUBMITTED);
        a.setIntegrity(ExamAttempt.INTEGRITY_CLEAN);
        return a;
    }

    @Test
    @DisplayName("SEC-07: Issues certificate using the Score recorded server-side, ignores any client value")
    void testIssueCertificate_Success() {
        when(certificateRepository.findByUserId(10L)).thenReturn(Collections.emptyList());
        when(examAttemptRepository.findByUserIdAndCourseId(10L, 20L))
                .thenReturn(List.of(attempt(10L, 20L, 85.0)));
        when(certificateRepository.getByCredentialId(any())).thenReturn(null);
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(inv -> inv.getArgument(0));

        Certificate cert = certificateService.issueCertificate(10L, 20L);

        assertNotNull(cert);
        assertEquals(10L, cert.getUserId());
        assertEquals(20L, cert.getCourseId());
        assertEquals(85.0, cert.getScore());
        assertTrue(cert.getCredentialId().startsWith("BC"));
        assertEquals(10, cert.getCredentialId().length());
        verify(certificateRepository).save(any(Certificate.class));
    }

    @Test
    @DisplayName("SEC-07: Uses the best attempt when a learner retakes the exam")
    void testIssueCertificate_UsesBestAttempt() {
        when(certificateRepository.findByUserId(10L)).thenReturn(Collections.emptyList());
        when(examAttemptRepository.findByUserIdAndCourseId(10L, 20L))
                .thenReturn(List.of(attempt(10L, 20L, 62.0), attempt(10L, 20L, 91.0), attempt(10L, 20L, 78.0)));
        when(certificateRepository.getByCredentialId(any())).thenReturn(null);
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(inv -> inv.getArgument(0));

        Certificate cert = certificateService.issueCertificate(10L, 20L);

        assertEquals(91.0, cert.getScore());
    }

    @Test
    @DisplayName("SEC-07: Rejects certificate issuance when no recorded attempt reaches the Passing Threshold")
    void testIssueCertificate_FailsBelowPassingScore() {
        when(certificateRepository.findByUserId(10L)).thenReturn(Collections.emptyList());
        when(examAttemptRepository.findByUserIdAndCourseId(10L, 20L))
                .thenReturn(List.of(attempt(10L, 20L, 75.0)));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                certificateService.issueCertificate(10L, 20L)
        );
        assertTrue(ex.getMessage().contains("Passing score of 80% is required"));
        verify(certificateRepository, never()).save(any());
    }

    @Test
    @DisplayName("SEC-07: Rejects certificate issuance when the learner has no attempt at all")
    void testIssueCertificate_NoAttempts() {
        when(certificateRepository.findByUserId(10L)).thenReturn(Collections.emptyList());
        when(examAttemptRepository.findByUserIdAndCourseId(10L, 20L)).thenReturn(Collections.emptyList());

        assertThrows(IllegalArgumentException.class, () -> certificateService.issueCertificate(10L, 20L));
        verify(certificateRepository, never()).save(any());
    }

    @Test
    @DisplayName("BUG-05: Idempotent - returns existing certificate if user already completed the course")
    void testIssueCertificate_Idempotent() {
        Certificate existingCert = new Certificate();
        existingCert.setId(1L);
        existingCert.setCredentialId("BC12345678");
        existingCert.setUserId(10L);
        existingCert.setCourseId(20L);

        when(certificateRepository.findByUserId(10L)).thenReturn(List.of(existingCert));

        Certificate cert = certificateService.issueCertificate(10L, 20L);

        assertEquals("BC12345678", cert.getCredentialId());
        verify(certificateRepository, never()).save(any());
        verify(examAttemptRepository, never()).findByUserIdAndCourseId(any(), any());
    }

    private ExamAttempt sitting(long userId, long courseId, double score, String status, String integrity) {
        ExamAttempt a = attempt(userId, courseId, score);
        a.setId((long) (score * 100));
        a.setStatus(status);
        a.setIntegrity(integrity);
        return a;
    }

    @Test
    @DisplayName("A flagged attempt never earns a credential, however high the score")
    void flaggedAttemptsDoNotCertify() {
        when(certificateRepository.findByUserId(10L)).thenReturn(Collections.emptyList());
        when(examAttemptRepository.findByUserIdAndCourseId(10L, 20L)).thenReturn(List.of(
                sitting(10L, 20L, 100.0, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED)));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> certificateService.issueCertificate(10L, 20L));
        assertTrue(ex.getMessage().contains("clean"));
        verify(certificateRepository, never()).save(any());
    }

    @Test
    @DisplayName("A clean pass is credited even when a better score sits on a flagged attempt")
    void cleanAttemptWinsOverFlaggedHigherScore() {
        when(certificateRepository.findByUserId(10L)).thenReturn(Collections.emptyList());
        when(examAttemptRepository.findByUserIdAndCourseId(10L, 20L)).thenReturn(List.of(
                sitting(10L, 20L, 100.0, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED),
                sitting(10L, 20L, 84.0, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_CLEAN)));
        when(certificateRepository.getByCredentialId(any())).thenReturn(null);
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(inv -> inv.getArgument(0));

        Certificate cert = certificateService.issueCertificate(10L, 20L);

        assertEquals(84.0, cert.getScore());
        assertEquals(8400L, cert.getAttemptId(), "the credential traces to the attempt it was graded from");
    }

    @Test
    @DisplayName("Unfinished sittings are not creditable: in progress and voided")
    void openAndVoidedSittingsDoNotCertify() {
        when(certificateRepository.findByUserId(10L)).thenReturn(Collections.emptyList());
        when(examAttemptRepository.findByUserIdAndCourseId(10L, 20L)).thenReturn(List.of(
                sitting(10L, 20L, 100.0, ExamAttempt.STATUS_IN_PROGRESS, ExamAttempt.INTEGRITY_CLEAN),
                sitting(10L, 20L, 96.0, ExamAttempt.STATUS_VOIDED, ExamAttempt.INTEGRITY_CLEAN)));

        assertThrows(IllegalArgumentException.class, () -> certificateService.issueCertificate(10L, 20L));
        verify(certificateRepository, never()).save(any());
    }

    @Test
    @DisplayName("Time-running-out submissions and un-reviewed REVIEW records still certify")
    void expiredAndReviewAttemptsCertify() {
        when(certificateRepository.findByUserId(10L)).thenReturn(Collections.emptyList());
        when(examAttemptRepository.findByUserIdAndCourseId(10L, 20L)).thenReturn(List.of(
                sitting(10L, 20L, 88.0, ExamAttempt.STATUS_EXPIRED, ExamAttempt.INTEGRITY_CLEAN),
                sitting(10L, 20L, 92.0, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_REVIEW)));
        when(certificateRepository.getByCredentialId(any())).thenReturn(null);
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(inv -> inv.getArgument(0));

        // REVIEW is a queue for a human, not a verdict; revoking a pass before anyone has looked
        // would punish the learner for the reviewer's backlog.
        assertEquals(92.0, certificateService.issueCertificate(10L, 20L).getScore());
    }

    @Test
    @DisplayName("A retake after a flagged attempt can still certify from the clean sitting")
    void flaggedSittingDoesNotPoisonLaterOnes() {
        when(certificateRepository.findByUserId(10L)).thenReturn(Collections.emptyList());
        when(examAttemptRepository.findByUserIdAndCourseId(10L, 20L)).thenReturn(List.of(
                sitting(10L, 20L, 95.0, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_FLAGGED),
                sitting(10L, 20L, 81.0, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.INTEGRITY_CLEAN)));
        when(certificateRepository.getByCredentialId(any())).thenReturn(null);
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(inv -> inv.getArgument(0));

        assertEquals(81.0, certificateService.issueCertificate(10L, 20L).getScore());
    }
}

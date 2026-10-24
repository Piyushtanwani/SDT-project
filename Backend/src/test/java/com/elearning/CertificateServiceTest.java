package com.elearning;

import com.elearning.models.Certificate;
import com.elearning.repositories.CertificateRepository;
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

    @InjectMocks
    private CertificateService certificateService;

    @Test
    @DisplayName("BUG-05 & SEC-06: Generates collision-free credential ID and enforces 80% passing threshold")
    void testIssueCertificate_Success() {
        when(certificateRepository.findByUserId(10L)).thenReturn(Collections.emptyList());
        when(certificateRepository.getByCredentialId(any())).thenReturn(null);
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Certificate cert = certificateService.issueCertificate(10L, 20L, 85.0);

        assertNotNull(cert);
        assertEquals(10L, cert.getUserId());
        assertEquals(20L, cert.getCourseId());
        assertEquals(85.0, cert.getScore());
        assertTrue(cert.getCredentialId().startsWith("BC"));
        assertTrue(cert.getCredentialId().length() >= 8);
        verify(certificateRepository).save(any(Certificate.class));
    }

    @Test
    @DisplayName("SEC-06: Rejects certificate issuance if score is below 80%")
    void testIssueCertificate_FailsBelowPassingScore() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                certificateService.issueCertificate(10L, 20L, 75.0)
        );
        assertTrue(ex.getMessage().contains("Passing score of 80% is required"));
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

        Certificate cert = certificateService.issueCertificate(10L, 20L, 90.0);

        assertEquals("BC12345678", cert.getCredentialId());
        verify(certificateRepository, never()).save(any());
    }
}

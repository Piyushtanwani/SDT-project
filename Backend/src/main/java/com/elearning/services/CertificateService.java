package com.elearning.services;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.elearning.models.Certificate;
import com.elearning.repositories.CertificateRepository;
import com.elearning.response_request.UserCertificateDTO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CertificateService {

    private final CertificateRepository certificateRepository;

    public CertificateService(CertificateRepository certificateRepository) {
        this.certificateRepository = certificateRepository;
    }

    public long countCertificatesByCourse(Long courseId) {
        return certificateRepository.countByCourseId(courseId);
    }

    public List<UserCertificateDTO> getLeaderboard() {
        return certificateRepository.findTopAchievers();
    }

    public List<Certificate> getCertificatesByUser(Long userId) {
        return certificateRepository.findByUserId(userId);
    }

    public Optional<Certificate> getCertificatesByCredentialId(String credentialId) {
        Certificate cert = certificateRepository.getByCredentialId(credentialId);
        return Optional.ofNullable(cert);
    }

    @Transactional
    public Certificate issueCertificate(Long userId, Long courseId, double score) {
        if (score < 80.0) {
            throw new IllegalArgumentException("Passing score of 80% is required for certificate issuance.");
        }

        // Return existing certificate if already issued for this user & course (idempotent)
        List<Certificate> existing = certificateRepository.findByUserId(userId);
        for (Certificate c : existing) {
            if (courseId.equals(c.getCourseId())) {
                return c;
            }
        }

        // Generate collision-resistant unique credential ID
        String credentialId;
        int attempts = 0;
        do {
            credentialId = "BC" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
            attempts++;
        } while (certificateRepository.getByCredentialId(credentialId) != null && attempts < 5);

        Certificate certificate = new Certificate();
        certificate.setUserId(userId);
        certificate.setCourseId(courseId);
        certificate.setScore(score);
        certificate.setCredentialId(credentialId);
        certificate.setIssuedAt(LocalDateTime.now());
        return certificateRepository.save(certificate);
    }
}

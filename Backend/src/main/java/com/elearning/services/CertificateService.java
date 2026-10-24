package com.elearning.services;

import org.springframework.stereotype.Service;
import com.elearning.models.Certificate;
import com.elearning.repositories.CertificateRepository;
import com.elearning.response_request.UserCertificateDTO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class CertificateService {

    private final CertificateRepository certificateRepository;

    public long countCertificatesByCourse(Long courseId) {
        return certificateRepository.countByCourseId(courseId);
    }

    public List<UserCertificateDTO> getLeaderboard() {
        return certificateRepository.findTopAchievers();
    }
    
    public CertificateService(CertificateRepository certificateRepository) {
        this.certificateRepository = certificateRepository;
    }

    public List<Certificate> getCertificatesByUser(Long userId) {
        return certificateRepository.findByUserId(userId);
    }
    
    public Certificate getCertificatesByCredentialId(String credentialId) {
        return certificateRepository.getByCredentialId(credentialId);
    }

    public Certificate issueCertificate(Long userId, Long courseId, double score) {
    	 String credentialId = "BC" + String.format("%06d", new java.util.Random().nextInt(9999999));
        Certificate certificate = new Certificate();
        certificate.setUserId(userId);
        certificate.setCourseId(courseId);
        certificate.setScore(score);
        certificate.setCredentialId(credentialId);
        certificate.setIssuedAt(LocalDateTime.now());
        return certificateRepository.save(certificate);
    }
}

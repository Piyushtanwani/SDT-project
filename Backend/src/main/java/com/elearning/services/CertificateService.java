package com.elearning.services;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.elearning.models.Certificate;
import com.elearning.models.ExamAttempt;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.repositories.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import com.elearning.response_request.UserCertificateDTO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CertificateService {

    public static final double PASSING_SCORE = 80.0;

    private final CertificateRepository certificateRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    public CertificateService(CertificateRepository certificateRepository,
                              ExamAttemptRepository examAttemptRepository) {

        this(certificateRepository, examAttemptRepository, null, null);
    }

    @Autowired
    public CertificateService(CertificateRepository certificateRepository,
                              ExamAttemptRepository examAttemptRepository,
                              PaymentRepository paymentRepository,
                              PaymentService paymentService) {

        this.certificateRepository = certificateRepository;
        this.examAttemptRepository = examAttemptRepository;
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
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
    public Certificate issueCertificate(Long userId, Long courseId) {
        // Return existing certificate if already issued for this user & course (idempotent)
        List<Certificate> existing = certificateRepository.findByUserId(userId);
        for (Certificate c : existing) {
            if (courseId.equals(c.getCourseId())) {
                return c;
            }
        }

        // The Score is read from the Learner's own recorded attempts. A caller cannot
        // supply it, so a Certificate always traces back to an Exam Attempt.
        double bestScore = examAttemptRepository.findByUserIdAndCourseId(userId, courseId).stream()
                .mapToDouble(ExamAttempt::getScore)
                .max()
                .orElse(0.0);
        if (bestScore < PASSING_SCORE) {
            throw new IllegalArgumentException("Passing score of 80% is required for certificate issuance.");
        }

        if (paymentService != null && paymentService.isConfigured() && paymentRepository != null) {
            boolean hasPaid = paymentRepository.existsByUserIdAndStatus(userId, "SUCCESS");
            if (!hasPaid) {
                throw new IllegalStateException("Payment verification required before certificate can be issued.");
            }
        }

        // Generate collision-resistant unique credential ID
        String credentialId;
        int attempts = 0;
        do {
            credentialId = "BC" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
            attempts++;
        } while (certificateRepository.getByCredentialId(credentialId) != null && attempts < 5);

        while (certificateRepository.getByCredentialId(credentialId) != null) {
            credentialId = "BC" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        }

        Certificate certificate = new Certificate();
        certificate.setUserId(userId);
        certificate.setCourseId(courseId);
        certificate.setScore(bestScore);
        certificate.setCredentialId(credentialId);
        certificate.setIssuedAt(LocalDateTime.now());
        return certificateRepository.save(certificate);
    }
}

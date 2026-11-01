package com.elearning.services;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.elearning.models.Certificate;
import com.elearning.models.ExamAttempt;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.response_request.UserCertificateDTO;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CertificateService {

    public static final double PASSING_SCORE = 80.0;

    private final CertificateRepository certificateRepository;
    private final ExamAttemptRepository examAttemptRepository;

    public CertificateService(CertificateRepository certificateRepository,
                              ExamAttemptRepository examAttemptRepository) {
        this.certificateRepository = certificateRepository;
        this.examAttemptRepository = examAttemptRepository;
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

        // The score is read from the learner's own recorded attempts, and only from attempts the
        // proctor left clean: an attempt a reviewer flagged cannot be the one that earns a
        // credential, however high its number. A caller cannot supply the score, so a certificate
        // always traces back to an exam attempt.
        ExamAttempt best = examAttemptRepository.findByUserIdAndCourseId(userId, courseId).stream()
                .filter(CertificateService::isCertifiable)
                .max(Comparator.comparingDouble(ExamAttempt::getScore))
                .orElse(null);
        if (best == null) {
            throw new IllegalArgumentException(
                    "No clean passing attempt is on record. Passing score of " + (int) PASSING_SCORE + "% is required.");
        }
        double bestScore = best.getScore();
        if (bestScore < PASSING_SCORE) {
            throw new IllegalArgumentException("Passing score of 80% is required for certificate issuance.");
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
        certificate.setScore(bestScore);
        certificate.setAttemptId(best.getId());
        certificate.setCredentialId(credentialId);
        certificate.setIssuedAt(LocalDateTime.now());
        return certificateRepository.save(certificate);
    }

    /**
     * Whether an attempt may carry a credential.
     *
     * A flagged or voided sitting is excluded even when its score is the highest on record, so
     * raising a certificate by farming attempts under a cloud does not work. REVIEW is allowed to
     * carry one: that verdict only asks a human to look, and a learner should not lose a
     * certificate because nobody has looked yet. A sitting that has not closed is not a result.
     */
    private static boolean isCertifiable(ExamAttempt attempt) {
        // Rows written before attempts became server-owned sessions have no status at all, and the
        // only way one could be created then was by submitting — so an unset status is a submitted
        // attempt. Treating it otherwise would revoke credentials from learners who already passed.
        String status = attempt.getStatus();
        boolean counted = status == null || ExamAttempt.STATUS_SUBMITTED.equals(status)
                || ExamAttempt.STATUS_EXPIRED.equals(status);
        return counted && !ExamAttempt.INTEGRITY_FLAGGED.equalsIgnoreCase(attempt.getIntegrity());
    }
}

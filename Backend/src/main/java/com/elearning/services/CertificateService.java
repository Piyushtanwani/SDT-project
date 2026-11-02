package com.elearning.services;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.elearning.models.Certificate;
import com.elearning.models.ExamAttempt;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.response_request.UserCertificateView;
import com.elearning.response_request.UserCertificateDTO;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CertificateService {

    public static final double PASSING_SCORE = 80.0;

    private final CertificateRepository certificateRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final PaymentService paymentService;

    public CertificateService(CertificateRepository certificateRepository,
                              ExamAttemptRepository examAttemptRepository,
                              PaymentService paymentService) {
        this.certificateRepository = certificateRepository;
        this.examAttemptRepository = examAttemptRepository;
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

    /**
     * A learner's own credentials, each one carrying what the invigilation of its sitting said.
     *
     * The certificate used to be a score and a date, which left a learner holding a piece of paper
     * while a flag they had never seen sat behind it. The verdict, the weight and whether a human
     * has read the sitting belong on the certificate, because they are the reason it may not stand.
     */
    public List<UserCertificateView> certificatesWithProctoring(Long userId) {
        List<UserCertificateView> views = new ArrayList<>();
        for (Certificate certificate : certificateRepository.findByUserId(userId)) {
            ExamAttempt attempt = certificate.getAttemptId() == null
                    ? null
                    : examAttemptRepository.findById(certificate.getAttemptId()).orElse(null);
            views.add(UserCertificateView.of(certificate, attempt));
        }
        return views;
    }

    public Optional<Certificate> getCertificatesByCredentialId(String credentialId) {
        Certificate cert = certificateRepository.getByCredentialId(credentialId);
        return Optional.ofNullable(cert);
    }

    /** The sitting behind a credential, so a public verification can say how it was watched. */
    public Optional<ExamAttempt> attemptBehind(Certificate certificate) {
        if (certificate == null || certificate.getAttemptId() == null) {
            return Optional.empty();
        }
        return examAttemptRepository.findById(certificate.getAttemptId());
    }

    @Transactional
    public Certificate issueCertificate(Long userId, Long courseId) {
        // One credential per learner per course: whatever is already on file is brought in line with
        // its sitting and returned, rather than a second copy being written.
        List<Certificate> existing = certificateRepository.findByUserIdAndCourseId(userId, courseId);
        if (!existing.isEmpty()) {
            // A credential withdrawn because of its sitting is put back the moment that sitting
            // is cleared, so paying once never buys a second copy of the same certificate.
            syncCredentialWith(existing.get(0));
            return existing.get(0);
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

        // A credential is bought with a fee this server verified, never with a receipt the browser
        // claims (design rule 5). The gate only closes where a gateway exists to be paid into: with
        // no Razorpay keys on this server nobody could pay, so issuing stays open rather than
        // holding every learner's result hostage to a payment screen that cannot work.
        boolean feeRequired = paymentService.isConfigured();
        if (feeRequired && !paymentService.hasUnspentCertificateFee(userId)) {
            throw new IllegalStateException(
                    "The certificate fee has not been received for this account.");
        }

        // Reserve a credential id that is not already on file, and say so plainly if the space is
        // somehow full instead of saving a duplicate and letting the caller eat a 500.
        String credentialId = null;
        for (int attempt = 0; attempt < 6 && credentialId == null; attempt++) {
            String candidate = "BC" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
            if (certificateRepository.getByCredentialId(candidate) == null) {
                credentialId = candidate;
            }
        }
        if (credentialId == null) {
            throw new IllegalStateException("Could not reserve a credential id. Please try again.");
        }

        Certificate certificate = new Certificate();
        certificate.setUserId(userId);
        certificate.setCourseId(courseId);
        certificate.setScore(bestScore);
        certificate.setAttemptId(best.getId());
        certificate.setCredentialId(credentialId);
        certificate.setIssuedAt(LocalDateTime.now());
        certificate.setStatus(Certificate.STATUS_ISSUED);
        Certificate saved = certificateRepository.save(certificate);
        if (feeRequired) {
            paymentService.spendCertificateFee(userId, saved.getId());
        }
        return saved;
    }

    /**
     * Puts a credential back in line with the sitting it was earned on.
     *
     * A certificate is not a permanent object here: it stands while the attempt under it stands. So
     * when a reviewer leaves a sitting flagged or voids it, the credential that came from it stops
     * verifying and says why; when the same reviewer clears it, the credential comes back without
     * anybody paying twice for the same piece of evidence.
     */
    @Transactional
    public void syncCredentialsFor(ExamAttempt attempt) {
        if (attempt == null || attempt.getId() == null) {
            return;
        }
        for (Certificate certificate : certificateRepository.findByUserId(attempt.getUserId())) {
            if (attempt.getId().equals(certificate.getAttemptId())) {
                applyVerdict(certificate, attempt);
            }
        }
    }

    /** Re-checks one credential against the attempt behind it, for a caller that only has the certificate. */
    @Transactional
    public Certificate syncCredentialWith(Certificate certificate) {
        if (certificate == null || certificate.getAttemptId() == null) {
            return certificate;
        }
        return applyVerdict(certificate, examAttemptRepository.findById(certificate.getAttemptId()).orElse(null));
    }

    private Certificate applyVerdict(Certificate certificate, ExamAttempt attempt) {
        if (attempt == null) {
            return certificate;
        }
        boolean certifiable = isCertifiable(attempt);
        boolean withdrawn = Certificate.STATUS_REVOKED.equalsIgnoreCase(certificate.getStatus());
        if (certifiable == !withdrawn) {
            return certificate;
        }
        if (certifiable) {
            certificate.setStatus(Certificate.STATUS_ISSUED);
            certificate.setWithdrawnAt(null);
            certificate.setWithdrawalReason(null);
        } else {
            certificate.setStatus(Certificate.STATUS_REVOKED);
            certificate.setWithdrawnAt(LocalDateTime.now());
            certificate.setWithdrawalReason(withdrawalReason(attempt));
        }
        return certificateRepository.save(certificate);
    }

    /** Written for the learner to read, not for a log file. */
    private static String withdrawalReason(ExamAttempt attempt) {
        if (ExamAttempt.STATUS_VOIDED.equals(attempt.getStatus())) {
            return "A reviewer voided exam attempt " + attempt.getId() + ", which this certificate was earned on.";
        }
        return "Exam attempt " + attempt.getId() + ", which this certificate was earned on, is still flagged"
                + " for invigilation. A reviewer clearing it restores this certificate.";
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

package com.elearning.response_request;

import java.time.LocalDateTime;

/**
 * Public view of a certificate.
 *
 * Deliberately omits user and course identifiers. What it does carry is how the sitting behind the
 * credential was watched, because a verification page that cannot say "this paper was held for
 * review" is a page that quietly launders a flagged attempt into a clean-looking certificate.
 */
public class CredentialVerificationDTO {

    private String credentialId;
    private String holderName;
    private String courseName;
    private double score;
    private LocalDateTime issuedAt;
    private String status;
    private String proctoringLine;
    private LocalDateTime withdrawnAt;
    private String withdrawalReason;

    public CredentialVerificationDTO() {
    }

    public CredentialVerificationDTO(String credentialId, String holderName, String courseName,
                                     double score, LocalDateTime issuedAt) {
        this(credentialId, holderName, courseName, score, issuedAt, "ISSUED", null, null, null);
    }

    public CredentialVerificationDTO(String credentialId, String holderName, String courseName,
                                     double score, LocalDateTime issuedAt, String status,
                                     String proctoringLine, LocalDateTime withdrawnAt,
                                     String withdrawalReason) {
        this.credentialId = credentialId;
        this.holderName = holderName;
        this.courseName = courseName;
        this.score = score;
        this.issuedAt = issuedAt;
        this.status = status;
        this.proctoringLine = proctoringLine;
        this.withdrawnAt = withdrawnAt;
        this.withdrawalReason = withdrawalReason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getProctoringLine() {
        return proctoringLine;
    }

    public void setProctoringLine(String proctoringLine) {
        this.proctoringLine = proctoringLine;
    }

    public LocalDateTime getWithdrawnAt() {
        return withdrawnAt;
    }

    public void setWithdrawnAt(LocalDateTime withdrawnAt) {
        this.withdrawnAt = withdrawnAt;
    }

    public String getWithdrawalReason() {
        return withdrawalReason;
    }

    public void setWithdrawalReason(String withdrawalReason) {
        this.withdrawalReason = withdrawalReason;
    }

    public String getCredentialId() {
        return credentialId;
    }

    public void setCredentialId(String credentialId) {
        this.credentialId = credentialId;
    }

    public String getHolderName() {
        return holderName;
    }

    public void setHolderName(String holderName) {
        this.holderName = holderName;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }

    public double getScore() {
        return score;
    }

    public void setScore(double score) {
        this.score = score;
    }

    public LocalDateTime getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(LocalDateTime issuedAt) {
        this.issuedAt = issuedAt;
    }
}

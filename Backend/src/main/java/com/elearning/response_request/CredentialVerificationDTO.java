package com.elearning.response_request;

import java.time.LocalDateTime;

/** Public view of a certificate. Deliberately omits user and course identifiers. */
public class CredentialVerificationDTO {

    private String credentialId;
    private String holderName;
    private String courseName;
    private double score;
    private LocalDateTime issuedAt;

    public CredentialVerificationDTO() {
    }

    public CredentialVerificationDTO(String credentialId, String holderName, String courseName,
                                     double score, LocalDateTime issuedAt) {
        this.credentialId = credentialId;
        this.holderName = holderName;
        this.courseName = courseName;
        this.score = score;
        this.issuedAt = issuedAt;
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

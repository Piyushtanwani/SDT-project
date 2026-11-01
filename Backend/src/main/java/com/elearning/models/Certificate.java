package com.elearning.models;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Certificate {

    /** The credential stands. */
    public static final String STATUS_ISSUED = "ISSUED";
    /** A reviewer took the underlying sitting away, so the credential no longer verifies. */
    public static final String STATUS_REVOKED = "REVOKED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId; // Links to the user who received the certificate

    @Column(nullable = false)
    private Long courseId; // Links to the course for which the certificate was awarded

    @Column(nullable = false)
    private double score; // Score achieved in the exam

    @Column(nullable = false)
    private LocalDateTime issuedAt = LocalDateTime.now(); // Certificate issue date

    @Column(nullable = false, unique = true)
    private String credentialId; // Unique credential ID for verification

    /** The attempt this credential was earned on, so a result can be re-examined later. */
    @Column(name = "attempt_id")
    private Long attemptId;

    /**
     * Nullable on purpose: this column lands on a table that already holds issued certificates, and
     * a certificate with no status written on it was never withdrawn. Read it through getStatus().
     */
    @Column(name = "status")
    private String status = STATUS_ISSUED;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    /** In the learner's own words, because they are the ones who have to go ask about it. */
    @Column(name = "withdrawal_reason", length = 500)
    private String withdrawalReason;

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Long getUserId() {
		return userId;
	}

	public void setUserId(Long userId) {
		this.userId = userId;
	}

	public Long getCourseId() {
		return courseId;
	}

	public void setCourseId(Long courseId) {
		this.courseId = courseId;
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

	public String getCredentialId() {
		return credentialId;
	}

	public void setCredentialId(String credentialId) {
		this.credentialId = credentialId;
	}

	public Certificate(Long id, Long userId, Long courseId, double score, LocalDateTime issuedAt, String credentialId) {
		super();
		this.id = id;
		this.userId = userId;
		this.courseId = courseId;
		this.score = score;
		this.issuedAt = issuedAt;
		this.credentialId = credentialId;
	}

	public Certificate() {
	}
    
}

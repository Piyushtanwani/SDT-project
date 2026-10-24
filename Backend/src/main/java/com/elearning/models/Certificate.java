package com.elearning.models;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Certificate {

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

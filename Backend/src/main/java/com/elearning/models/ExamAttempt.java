package com.elearning.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId; // Links to the user attempting the exam

    @Column(nullable = false)
    private Long courseId; // Links to the course for which the attempt is made

    @Column(nullable = false)
    private double score; // Score of the attempt

    @Column(nullable = false)
    private boolean passed; // Indicates if the user passed or failed

    @Column(nullable = false)
    private LocalDateTime attemptedAt = LocalDateTime.now(); // Timestamp of the attempt

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

	public boolean isPassed() {
		return passed;
	}

	public void setPassed(boolean passed) {
		this.passed = passed;
	}

	public LocalDateTime getAttemptedAt() {
		return attemptedAt;
	}

	public void setAttemptedAt(LocalDateTime attemptedAt) {
		this.attemptedAt = attemptedAt;
	}

	public ExamAttempt(Long id, Long userId, Long courseId, double score, boolean passed, LocalDateTime attemptedAt) {
		super();
		this.id = id;
		this.userId = userId;
		this.courseId = courseId;
		this.score = score;
		this.passed = passed;
		this.attemptedAt = attemptedAt;
	}

	public ExamAttempt() {
	}
    
}

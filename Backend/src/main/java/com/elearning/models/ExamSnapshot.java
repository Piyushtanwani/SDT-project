package com.elearning.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * A webcam frame captured during a proctored attempt, stored as a data URL.
 *
 * Capture is consented to in the browser and capped per attempt, so the row count stays bounded
 * while still giving a reviewer something to look at rather than only a counter.
 */
@Entity
@Table(name = "exam_snapshot")
public class ExamSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** What triggered the capture: START, PERIODIC, VIOLATION or FACE_MISSING. */
    @Column(nullable = false, length = 32)
    private String label;

    @Column(name = "server_received_at", nullable = false)
    private LocalDateTime serverReceivedAt = LocalDateTime.now();

    @Column(nullable = false, columnDefinition = "TEXT")
    private String imageDataUrl;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public LocalDateTime getServerReceivedAt() {
        return serverReceivedAt;
    }

    public void setServerReceivedAt(LocalDateTime serverReceivedAt) {
        this.serverReceivedAt = serverReceivedAt;
    }

    public String getImageDataUrl() {
        return imageDataUrl;
    }

    public void setImageDataUrl(String imageDataUrl) {
        this.imageDataUrl = imageDataUrl;
    }

    public ExamSnapshot(Long attemptId, Long userId, String label, LocalDateTime serverReceivedAt, String imageDataUrl) {
        this.attemptId = attemptId;
        this.userId = userId;
        this.label = label;
        this.serverReceivedAt = serverReceivedAt;
        this.imageDataUrl = imageDataUrl;
    }

    public ExamSnapshot() {
    }
}

package com.elearning.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * One proctoring signal observed during an attempt.
 *
 * The browser reports when it saw the event, but {@link #serverReceivedAt} is what the reviewer
 * trusts: a candidate with a tampered clock cannot move an event earlier or later in the record
 * that an admin reads.
 */
@Entity
@Table(name = "exam_proctor_event")
public class ExamProctorEvent {

    public static final String SEVERITY_LOW = "LOW";
    public static final String SEVERITY_MEDIUM = "MEDIUM";
    public static final String SEVERITY_HIGH = "HIGH";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(nullable = false, length = 32)
    private String kind;

    @Column(nullable = false, length = 10)
    private String severity = SEVERITY_LOW;

    @Column(length = 500)
    private String detail;

    /** Reported by the browser. Advisory only; never used for scoring or deadlines. */
    @Column(name = "client_reported_at")
    private LocalDateTime clientReportedAt;

    @Column(name = "server_received_at", nullable = false)
    private LocalDateTime serverReceivedAt = LocalDateTime.now();

    /** Seconds into the attempt, as the server saw it when the event arrived. */
    @Column(name = "elapsed_seconds")
    private Long elapsedSeconds;

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

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public LocalDateTime getClientReportedAt() {
        return clientReportedAt;
    }

    public void setClientReportedAt(LocalDateTime clientReportedAt) {
        this.clientReportedAt = clientReportedAt;
    }

    public LocalDateTime getServerReceivedAt() {
        return serverReceivedAt;
    }

    public void setServerReceivedAt(LocalDateTime serverReceivedAt) {
        this.serverReceivedAt = serverReceivedAt;
    }

    public Long getElapsedSeconds() {
        return elapsedSeconds;
    }

    public void setElapsedSeconds(Long elapsedSeconds) {
        this.elapsedSeconds = elapsedSeconds;
    }

    public ExamProctorEvent(Long attemptId, Long userId, Long courseId, String kind, String severity, String detail) {
        this.attemptId = attemptId;
        this.userId = userId;
        this.courseId = courseId;
        this.kind = kind;
        this.severity = severity;
        this.detail = detail;
    }

    public ExamProctorEvent() {
    }
}

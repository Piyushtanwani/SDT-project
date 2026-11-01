package com.elearning.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * One exam sitting, owned by the server from the moment a question set is drawn.
 *
 * The row exists before the candidate answers anything: it carries the deadline, the exact
 * questions served and the integrity verdict, so no rule the browser could fake (time limit,
 * attempt count, which set was served) is decided by the browser.
 */
@Entity
public class ExamAttempt {

    /** The clock is running on the server against {@link #getDeadline()}. */
    public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    public static final String STATUS_SUBMITTED = "SUBMITTED";
    /** Ran out of time without a submit; graded from the last saved answers. */
    public static final String STATUS_EXPIRED = "EXPIRED";
    /** A reviewer threw the result out; it still cost the candidate an attempt. */
    public static final String STATUS_VOIDED = "VOIDED";

    public static final String INTEGRITY_CLEAN = "CLEAN";
    public static final String INTEGRITY_REVIEW = "REVIEW";
    public static final String INTEGRITY_FLAGGED = "FLAGGED";

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

    @Column(nullable = false)
    private String status = STATUS_IN_PROGRESS;

    /** The jti of the signed draw token minted with this row, so a token serves exactly one sitting. */
    @Column(name = "draw_token_id", length = 64)
    private String drawTokenId;

    /** 1-based ordinal used by the attempt cap; null on rows that predate proctoring. */
    @Column(name = "attempt_number")
    private Integer attemptNumber;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "deadline")
    private LocalDateTime deadline;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "total_questions")
    private Integer totalQuestions;

    @Column(name = "correct_count")
    private Integer correctCount;

    /** Comma-separated ids of the served questions, so an expired session can still be graded. */
    @Column(name = "question_ids", columnDefinition = "TEXT")
    private String questionIds;

    /** Question id to the four canonical letters in the order they were shown for this attempt. */
    @Column(name = "option_orders", columnDefinition = "TEXT")
    private String optionOrders;

    /** The most recent answer sheet the server received, kept so a crash cannot erase work. */
    @Column(columnDefinition = "TEXT")
    private String answers;

    @Column(name = "violation_count", nullable = false)
    private int violationCount = 0;

    /** Weighted severity total; compared with the flag threshold to decide the verdict. */
    @Column(name = "violation_points", nullable = false)
    private int violationPoints = 0;

    /** Read from the request header at draw time; a change mid-attempt is not the candidate's story to tell. */
    @Column(name = "user_agent", length = 512)
    private String userAgent;

    /** The address the sitting was started from, for the reviewer's "who else sits here" question. */
    @Column(name = "client_ip", length = 64)
    private String clientIp;

    /**
     * Cumulative seconds the browser reported the paper was not in full screen.
     *
     * Nullable on purpose: the column arrives on a table that already has rows, and a sitting from
     * before proctoring was compulsory genuinely spent no measurable time covered rather than zero.
     */
    @Column(name = "fullscreen_blocked_seconds")
    private Integer fullscreenBlockedSeconds;

    /** Which browser tab first claimed this sitting; a second one is the same attempt opened twice. */
    @Column(name = "browser_tab_id", length = 64)
    private String browserTabId;

    /** When the exam page last said it was still in the foreground. */
    @Column(name = "last_heartbeat_at")
    private LocalDateTime lastHeartbeatAt;

    @Column(name = "integrity", nullable = false)
    private String integrity = INTEGRITY_CLEAN;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDrawTokenId() {
        return drawTokenId;
    }

    public void setDrawTokenId(String drawTokenId) {
        this.drawTokenId = drawTokenId;
    }

    public Integer getAttemptNumber() {
        return attemptNumber;
    }

    public void setAttemptNumber(Integer attemptNumber) {
        this.attemptNumber = attemptNumber;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDateTime deadline) {
        this.deadline = deadline;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Integer getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public Integer getCorrectCount() {
        return correctCount;
    }

    public void setCorrectCount(Integer correctCount) {
        this.correctCount = correctCount;
    }

    public String getQuestionIds() {
        return questionIds;
    }

    public void setQuestionIds(String questionIds) {
        this.questionIds = questionIds;
    }

    public String getOptionOrders() {
        return optionOrders;
    }

    public void setOptionOrders(String optionOrders) {
        this.optionOrders = optionOrders;
    }

    public String getAnswers() {
        return answers;
    }

    public void setAnswers(String answers) {
        this.answers = answers;
    }

    public int getViolationCount() {
        return violationCount;
    }

    public void setViolationCount(int violationCount) {
        this.violationCount = violationCount;
    }

    public int getViolationPoints() {
        return violationPoints;
    }

    public void setViolationPoints(int violationPoints) {
        this.violationPoints = violationPoints;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getIntegrity() {
        return integrity;
    }

    public void setIntegrity(String integrity) {
        this.integrity = integrity;
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }

    public Long getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(Long reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public String getClientIp() {
        return clientIp;
    }

    public void setClientIp(String clientIp) {
        this.clientIp = clientIp;
    }

    public int getFullscreenBlockedSeconds() {
        return fullscreenBlockedSeconds == null ? 0 : fullscreenBlockedSeconds;
    }

    public void setFullscreenBlockedSeconds(int fullscreenBlockedSeconds) {
        this.fullscreenBlockedSeconds = Math.max(0, fullscreenBlockedSeconds);
    }

    public String getBrowserTabId() {
        return browserTabId;
    }

    public void setBrowserTabId(String browserTabId) {
        this.browserTabId = browserTabId;
    }

    public LocalDateTime getLastHeartbeatAt() {
        return lastHeartbeatAt;
    }

    public void setLastHeartbeatAt(LocalDateTime lastHeartbeatAt) {
        this.lastHeartbeatAt = lastHeartbeatAt;
    }

    public boolean isOpen() {
        return STATUS_IN_PROGRESS.equals(status);
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

package com.elearning.services;

import com.elearning.models.ExamAttempt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * The rules a proctored attempt is held to, all of them enforced on the server.
 *
 * Every value here used to live only in the browser, which meant a candidate with DevTools open
 * could edit their own time limit. Defaults are the shipped policy; each one can be overridden per
 * environment with an {@code app.exam.*} property.
 */
@Component
public class ExamPolicy {

    /** The exam as advertised to learners: 25 questions in 40 minutes. */
    public static final int QUESTIONS_PER_EXAM = 25;

    private final Duration duration;
    private final Duration submitGrace;
    private final Duration cooldown;
    private final int maxAttempts;
    private final int minDurationSeconds;
    private final int maxEventsPerAttempt;
    private final int maxSnapshotsPerAttempt;
    private final int maxSnapshotChars;
    private final int flagThreshold;
    private final int reviewThreshold;
    private final int maxFullscreenBlockSeconds;
    private final int heartbeatGapSeconds;
    private final int minSecondsPerQuestion;
    private final boolean fullscreenRequired;

    public ExamPolicy(
            @Value("${app.exam.duration-minutes:40}") long durationMinutes,
            @Value("${app.exam.submit-grace-seconds:90}") long submitGraceSeconds,
            @Value("${app.exam.max-attempts:3}") int maxAttempts,
            @Value("${app.exam.cooldown-hours:6}") long cooldownHours,
            @Value("${app.exam.min-duration-seconds:120}") int minDurationSeconds,
            @Value("${app.exam.flag-threshold:6}") int flagThreshold,
            @Value("${app.exam.review-threshold:3}") int reviewThreshold,
            @Value("${app.exam.max-events-per-attempt:400}") int maxEventsPerAttempt,
            @Value("${app.exam.max-snapshots-per-attempt:15}") int maxSnapshotsPerAttempt,
            @Value("${app.exam.max-snapshot-kb:200}") int maxSnapshotKb,
            @Value("${app.exam.max-fullscreen-block-seconds:60}") int maxFullscreenBlockSeconds,
            @Value("${app.exam.heartbeat-gap-seconds:90}") int heartbeatGapSeconds,
            @Value("${app.exam.min-seconds-per-question:3}") int minSecondsPerQuestion,
            @Value("${app.exam.fullscreen-required:true}") boolean fullscreenRequired) {
        this.duration = Duration.ofMinutes(Math.max(1, durationMinutes));
        this.submitGrace = Duration.ofSeconds(Math.max(0, submitGraceSeconds));
        this.maxAttempts = Math.max(1, maxAttempts);
        this.cooldown = Duration.ofHours(Math.max(0, cooldownHours));
        this.minDurationSeconds = Math.max(0, minDurationSeconds);
        this.flagThreshold = Math.max(1, flagThreshold);
        this.reviewThreshold = Math.min(Math.max(1, reviewThreshold), this.flagThreshold);
        this.maxEventsPerAttempt = Math.max(1, maxEventsPerAttempt);
        this.maxSnapshotsPerAttempt = Math.max(0, maxSnapshotsPerAttempt);
        // A base64 data URL is about 4/3 of the image bytes, with room for the data: prefix.
        this.maxSnapshotChars = Math.max(1, maxSnapshotKb) * 1024 * 2;
        this.maxFullscreenBlockSeconds = Math.max(0, maxFullscreenBlockSeconds);
        this.heartbeatGapSeconds = Math.max(1, heartbeatGapSeconds);
        this.minSecondsPerQuestion = Math.max(0, minSecondsPerQuestion);
        this.fullscreenRequired = fullscreenRequired;
    }

    public Duration duration() {
        return duration;
    }

    public int durationMinutes() {
        return (int) duration.toMinutes();
    }

    /** Extra time past the deadline that still counts as on time, for a slow connection. */
    public Duration submitGrace() {
        return submitGrace;
    }

    /** The window a signed draw stays presentable: the exam itself, plus grace, plus slack. */
    public Duration drawValidity() {
        return duration.plus(submitGrace).plusMinutes(5);
    }

    public Duration cooldown() {
        return cooldown;
    }

    public int maxAttempts() {
        return maxAttempts;
    }

    /** A submit faster than this cannot reflect real work, so it is graded, flagged and left to a reviewer. */
    public int minDurationSeconds() {
        return minDurationSeconds;
    }

    /**
     * How long, in total, the paper may sit outside full screen before the sitting is closed.
     *
     * Full screen is what makes the questions unreadable to whoever else is in the room, so the
     * browser covers the paper the moment it is lost; this is the grace the covering is allowed
     * before the server stops believing the sitting is being taken honestly.
     */
    public int maxFullscreenBlockSeconds() {
        return maxFullscreenBlockSeconds;
    }

    /** How long the exam page may go without a heartbeat before the gap is worth a reviewer's eye. */
    public int heartbeatGapSeconds() {
        return heartbeatGapSeconds;
    }

    /** Below this average time per answered question, the sheet was not read, it was filled. */
    public int minSecondsPerQuestion() {
        return minSecondsPerQuestion;
    }

    /** Whether the sitting demands full screen; false only for an environment that cannot offer it. */
    public boolean fullscreenRequired() {
        return fullscreenRequired;
    }

    public int maxEventsPerAttempt() {
        return maxEventsPerAttempt;
    }

    public int maxSnapshotsPerAttempt() {
        return maxSnapshotsPerAttempt;
    }

    public int maxSnapshotChars() {
        return maxSnapshotChars;
    }

    /** Weighted violation points at or above which an attempt is marked FLAGGED. */
    public int flagThreshold() {
        return flagThreshold;
    }

    /** Weighted violation points at or above which an attempt is queued for a human look. */
    public int reviewThreshold() {
        return reviewThreshold;
    }

    /**
     * The verdict an attempt's violation weight earns. Nothing the candidate's own page does can
     * lower it: only a reviewer can, and that change is recorded with who made it.
     */
    public String verdictFor(int violationPoints) {
        if (violationPoints >= flagThreshold) {
            return ExamAttempt.INTEGRITY_FLAGGED;
        }
        return violationPoints >= reviewThreshold ? ExamAttempt.INTEGRITY_REVIEW : ExamAttempt.INTEGRITY_CLEAN;
    }
}

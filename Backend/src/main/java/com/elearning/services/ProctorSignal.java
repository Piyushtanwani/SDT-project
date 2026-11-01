package com.elearning.services;

/**
 * The proctoring signals an attempt can carry, with the weight each one contributes.
 *
 * Both the candidate's live panel and the admin's integrity view read these labels, so a signal
 * is described in exactly one place and cannot drift between the two screens.
 */
public enum ProctorSignal {

    // Observed in the browser.
    TAB_HIDDEN(ExamSeverity.HIGH, true, "Left the exam tab or switched to another window"),
    WINDOW_BLUR(ExamSeverity.MEDIUM, true, "Exam window lost focus"),
    FULLSCREEN_EXIT(ExamSeverity.HIGH, true, "Left full-screen mode"),
    FULLSCREEN_DENIED(ExamSeverity.MEDIUM, true, "Full-screen mode could not be entered"),
    COPY(ExamSeverity.MEDIUM, true, "Copied text out of the exam"),
    CUT(ExamSeverity.MEDIUM, true, "Cut text from the exam"),
    PASTE(ExamSeverity.HIGH, true, "Pasted text into the exam"),
    CONTEXT_MENU(ExamSeverity.MEDIUM, true, "Opened the browser menu"),
    TEXT_SELECTION(ExamSeverity.LOW, true, "Selected exam text"),
    DRAG(ExamSeverity.LOW, true, "Dragged content out of the exam"),
    FORBIDDEN_KEY(ExamSeverity.MEDIUM, true, "Pressed a blocked keyboard shortcut"),
    PRINT_SCREEN(ExamSeverity.MEDIUM, true, "Pressed the screenshot key"),
    PRINT_OR_SAVE(ExamSeverity.HIGH, true, "Tried to print or save the exam"),
    DEVTOOLS_KEY(ExamSeverity.HIGH, true, "Tried to open developer tools"),
    BEFORE_UNLOAD(ExamSeverity.HIGH, true, "Tried to close or reload the exam page"),
    NAVIGATION_BLOCKED(ExamSeverity.HIGH, true, "Tried to navigate away mid-exam"),
    USER_AGENT_CHANGED(ExamSeverity.HIGH, true, "Traffic for this attempt came from a different browser"),
    CAMERA_DENIED(ExamSeverity.LOW, false, "Camera was not permitted, so no frames were captured"),
    CAMERA_LOST(ExamSeverity.HIGH, true, "Camera feed stopped during the attempt"),
    HEARTBEAT(ExamSeverity.LOW, false, "Exam page reported that it is still in the foreground"),

    // Decided by the server, which the candidate cannot influence.
    TOO_FAST_SUBMIT(ExamSeverity.HIGH, true, "Submitted faster than the minimum attempt time"),
    LATE_SUBMIT(ExamSeverity.HIGH, true, "Submitted after the exam deadline"),
    TIME_EXHAUSTED(ExamSeverity.MEDIUM, true, "Ran out of time; graded from the last saved answers"),
    TOKEN_REPLAY(ExamSeverity.HIGH, true, "Presented a question set that had already been used"),
    EVENT_OVERFLOW(ExamSeverity.MEDIUM, true, "Reported more signals than one attempt can hold"),
    CLOCK_SKEW(ExamSeverity.MEDIUM, true, "Browser clock disagreed with the server"),
    REVIEW_DECISION(ExamSeverity.LOW, false, "A reviewer recorded a decision on this attempt"),
    VOIDED_BY_REVIEWER(ExamSeverity.LOW, false, "A reviewer voided this attempt's result");

    private final ExamSeverity severity;
    private final boolean counts;
    private final String label;

    ProctorSignal(ExamSeverity severity, boolean counts, String label) {
        this.severity = severity;
        this.counts = counts;
        this.label = label;
    }

    public ExamSeverity severity() {
        return severity;
    }

    /** Whether the signal adds to the attempt's integrity verdict. */
    public boolean counts() {
        return counts;
    }

    public String label() {
        return label;
    }

    /** Points this signal contributes toward the flag threshold. */
    public int points() {
        if (!counts) {
            return 0;
        }
        return switch (severity) {
            case LOW -> 1;
            case MEDIUM -> 2;
            case HIGH -> 3;
        };
    }

    public enum ExamSeverity {
        LOW, MEDIUM, HIGH
    }
}

package com.elearning.services;

/**
 * An exam rule stopped the request, with enough shape for the controller to pick a status and the
 * browser to pick a message.
 */
public class ExamRuleException extends RuntimeException {

    public enum Kind {
        /** The question set or token this request leans on is no longer usable. */
        STALE,
        /** A policy limit was hit: attempt cap, cooldown, or an implausibly fast submit. */
        POLICY,
        /** The caller does not own what they asked to write to. */
        DENIED,
        NOT_FOUND
    }

    private final Kind kind;

    public ExamRuleException(Kind kind, String message) {
        super(message);
        this.kind = kind;
    }

    public Kind kind() {
        return kind;
    }
}

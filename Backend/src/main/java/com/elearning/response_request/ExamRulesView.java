package com.elearning.response_request;

import java.time.LocalDateTime;
import java.util.List;

/**
 * The rules a candidate sees before pressing Start, built from the policy the server enforces, so
 * the screen cannot promise a time limit or an attempt count that is not actually applied.
 */
public record ExamRulesView(int questionCount,
                            int durationMinutes,
                            int passingScore,
                            int maxAttempts,
                            int attemptsUsed,
                            int attemptsRemaining,
                            LocalDateTime nextAllowedAt,
                            List<String> disclosures) {

    public static ExamRulesView of(ExamPolicyView policy, StandingView standing) {
        List<String> rules = List.of(
                policy.questionCount() + " questions, " + policy.durationMinutes() + " minutes. "
                        + "The timer runs on our server, so closing the tab does not pause it.",
                "Pass mark: " + policy.passingScore() + "%.",
                "Attempts: " + standing.attemptsRemaining() + " of " + policy.maxAttempts()
                        + " left for this exam"
                        + (policy.cooldownHours() > 0
                                ? ". Once they are used, one more unlocks every " + policy.cooldownHours() + " hours."
                                : "."),
                "Answers save themselves as you work, so a crash or a lost connection cannot erase them.",
                "Stay in full screen. Leaving full screen, switching tabs or windows, right-clicking, "
                        + "copying, pasting, printing and pressing the screenshot key are all recorded.",
                "Every record is shown to you on this exam's result page and to your instructor, who "
                        + "decides what it means.",
                "Your camera is optional. If you allow it, short frames are captured so a reviewer can "
                        + "see the room; if you decline, nothing is captured and that is recorded as a choice, not a fault.");
        return new ExamRulesView(policy.questionCount(), policy.durationMinutes(), policy.passingScore(),
                policy.maxAttempts(), standing.attemptsUsed(), standing.attemptsRemaining(),
                standing.nextAllowedAt(), rules);
    }

    /** The part of the policy worth showing a candidate before they start. */
    public record ExamPolicyView(int questionCount,
                                 int durationMinutes,
                                 int passingScore,
                                 int maxAttempts,
                                 long cooldownHours) {
    }

    public record StandingView(int attemptsUsed, int attemptsRemaining, LocalDateTime nextAllowedAt) {
    }
}

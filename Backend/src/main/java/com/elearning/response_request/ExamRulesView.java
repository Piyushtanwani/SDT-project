package com.elearning.response_request;

import java.time.LocalDateTime;
import java.util.ArrayList;
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
        List<String> rules = new ArrayList<>(List.of(
                policy.questionCount() + " questions, " + policy.durationMinutes() + " minutes. "
                        + "The timer runs on our server, so closing the tab does not pause it.",
                "Pass mark: " + policy.passingScore() + "%.",
                "Attempts: " + standing.attemptsRemaining() + " of " + policy.maxAttempts()
                        + " left for this exam"
                        + (policy.cooldownHours() > 0
                                ? ". Once they are used, one more unlocks every " + policy.cooldownHours() + " hours."
                                : "."),
                "Answers save themselves as you work, so a crash or a lost connection cannot erase them."));
        rules.add(policy.fullscreenRequired()
                ? "Full screen is required. The moment it is lost the questions are covered and cannot be read "
                        + "or answered until you go back — the button to do that is on the screen. "
                        + coveredMinuteBudget(policy.maxFullscreenBlockSeconds())
                        + " covered in one sitting closes the attempt, which is then graded from what you had "
                        + "already saved."
                : "Stay in full screen. Leaving full screen is recorded.");
        rules.add("Switching tabs or windows, right-clicking, copying, pasting, printing, dropping a file in, "
                + "starting a screen share, opening developer tools, resizing the window and pressing the "
                + "screenshot key are all recorded, along with anything that looks like a script answering for you.");
        rules.add("Every record is shown to you on this exam's result page and to your instructor, who decides "
                + "what it means. An attempt left flagged is not awarded a certificate until a reviewer clears it.");
        rules.add("Your camera is optional. If you allow it, short frames are captured so a reviewer can "
                + "see the room; if you decline, nothing is captured and that is recorded as a choice, not a fault.");
        return new ExamRulesView(policy.questionCount(), policy.durationMinutes(), policy.passingScore(),
                policy.maxAttempts(), standing.attemptsUsed(), standing.attemptsRemaining(),
                standing.nextAllowedAt(), List.copyOf(rules));
    }

    /** Candidates read minutes more easily than seconds, and the policy is set in seconds. */
    private static String coveredMinuteBudget(int seconds) {
        int minutes = Math.max(1, (int) Math.ceil(seconds / 60.0));
        return minutes == 1 ? "One minute" : minutes + " minutes";
    }

    /** The part of the policy worth showing a candidate before they start. */
    public record ExamPolicyView(int questionCount,
                                 int durationMinutes,
                                 int passingScore,
                                 int maxAttempts,
                                 long cooldownHours,
                                 int maxFullscreenBlockSeconds,
                                 boolean fullscreenRequired) {
    }

    public record StandingView(int attemptsUsed, int attemptsRemaining, LocalDateTime nextAllowedAt) {
    }
}

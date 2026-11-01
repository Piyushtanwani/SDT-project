package com.elearning.response_request;

import java.util.List;

/** The headline numbers an invigilator opens the page with, plus the queue that needs a decision. */
public record IntegrityOverview(int totalAttempts,
                                int inProgress,
                                int submitted,
                                int expired,
                                int flagged,
                                int review,
                                int voided,
                                int attemptsToday,
                                List<IntegrityRow> awaitingReview) {
}

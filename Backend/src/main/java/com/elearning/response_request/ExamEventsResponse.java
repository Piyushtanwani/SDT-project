package com.elearning.response_request;

/**
 * What an integrity report got back: how much landed, and whether the sitting is now over.
 *
 * The candidate's page needs the second half, because a server that closed an attempt out from under
 * a running timer must say so rather than leave the page ticking at a paper nobody is marking.
 */
public record ExamEventsResponse(boolean success,
                                 String message,
                                 boolean attemptClosed,
                                 String status,
                                 int fullscreenBlockedSeconds) {

    public static ExamEventsResponse recorded(int count, int fullscreenBlockedSeconds) {
        return new ExamEventsResponse(true, "Recorded " + count + " signals.", false, null, fullscreenBlockedSeconds);
    }
}

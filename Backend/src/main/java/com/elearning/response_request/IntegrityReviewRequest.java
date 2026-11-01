package com.elearning.response_request;

/** A reviewer's decision on one attempt. */
public record IntegrityReviewRequest(String verdict, String note) {
}

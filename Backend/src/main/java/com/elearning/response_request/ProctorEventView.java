package com.elearning.response_request;

import java.time.LocalDateTime;

/** One row of an attempt's integrity timeline, as shown to both the candidate and the reviewer. */
public record ProctorEventView(Long id,
                               String kind,
                               String label,
                               String severity,
                               int points,
                               String detail,
                               LocalDateTime serverReceivedAt,
                               LocalDateTime clientReportedAt,
                               Long elapsedSeconds) {
}

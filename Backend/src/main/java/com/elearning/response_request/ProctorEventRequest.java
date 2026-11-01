package com.elearning.response_request;

import java.time.LocalDateTime;

/**
 * One observed signal. The severity and label are decided by the server's signal catalogue, never
 * by this body, so a candidate cannot downgrade their own record.
 */
public class ProctorEventRequest {

    private String kind;
    private String detail;
    private LocalDateTime clientReportedAt;
    private Integer outOfFullscreenSeconds;

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public LocalDateTime getClientReportedAt() {
        return clientReportedAt;
    }

    public void setClientReportedAt(LocalDateTime clientReportedAt) {
        this.clientReportedAt = clientReportedAt;
    }

    /** How long the paper was covered before this signal was sent; only ever added, never subtracted. */
    public Integer getOutOfFullscreenSeconds() {
        return outOfFullscreenSeconds;
    }

    public void setOutOfFullscreenSeconds(Integer outOfFullscreenSeconds) {
        this.outOfFullscreenSeconds = outOfFullscreenSeconds;
    }
}

package com.elearning.response_request;

import java.util.List;

/** Body of an integrity report: signals the proctor observed since the last flush. */
public class ProctorEventBatchRequest {

    private List<ProctorEventRequest> events;
    private String browserTabId;

    public List<ProctorEventRequest> getEvents() {
        return events;
    }

    public void setEvents(List<ProctorEventRequest> events) {
        this.events = events;
    }

    /** A random id this browser tab minted once, so a second tab on the same sitting shows up. */
    public String getBrowserTabId() {
        return browserTabId;
    }

    public void setBrowserTabId(String browserTabId) {
        this.browserTabId = browserTabId;
    }
}

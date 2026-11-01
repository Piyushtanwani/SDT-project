package com.elearning.response_request;

import java.util.List;

/** Body of an integrity report: signals the proctor observed since the last flush. */
public class ProctorEventBatchRequest {

    private List<ProctorEventRequest> events;

    public List<ProctorEventRequest> getEvents() {
        return events;
    }

    public void setEvents(List<ProctorEventRequest> events) {
        this.events = events;
    }
}

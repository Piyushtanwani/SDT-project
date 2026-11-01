package com.elearning.response_request;

/** One consented webcam frame, as a data URL produced in the browser. */
public record SnapshotRequest(String label, String imageDataUrl) {
}

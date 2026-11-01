package com.elearning.response_request;

import java.time.LocalDateTime;

/** A captured frame. The image itself only travels to the reviewer who opens one attempt. */
public record SnapshotView(Long id, String label, LocalDateTime serverReceivedAt, String imageDataUrl) {
}

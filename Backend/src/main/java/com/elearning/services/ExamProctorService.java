package com.elearning.services;

import com.elearning.models.ExamAttempt;
import com.elearning.models.ExamProctorEvent;
import com.elearning.models.ExamSnapshot;
import com.elearning.repositories.ExamProctorEventRepository;
import com.elearning.repositories.ExamSnapshotRepository;
import com.elearning.response_request.ProctorEventRequest;
import com.elearning.response_request.ProctorEventView;
import com.elearning.response_request.SnapshotView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Turns what the browser noticed into the record a reviewer reads.
 *
 * The browser names a signal; this service decides its severity, its weight, its label and the
 * time it landed. A candidate who rewrites their own page can send a list of signals they cannot
 * get rid of, but cannot send one that counts for less than the catalogue says, and cannot move
 * any of them in time.
 */
@Service
public class ExamProctorService {

    private static final Logger log = LoggerFactory.getLogger(ExamProctorService.class);

    private static final int DETAIL_LIMIT = 500;

    /** The leading bytes of the only picture formats a browser canvas produces. */
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47};
    private static final byte[] GIF = {0x47, 0x49, 0x46};
    private static final byte[] RIFF = {0x52, 0x49, 0x46, 0x46};
    private static final byte[] WEBP = {0x57, 0x45, 0x42, 0x50};

    private final ExamProctorEventRepository eventRepository;
    private final ExamSnapshotRepository snapshotRepository;
    private final ExamPolicy policy;

    public ExamProctorService(ExamProctorEventRepository eventRepository,
                              ExamSnapshotRepository snapshotRepository,
                              ExamPolicy policy) {
        this.eventRepository = eventRepository;
        this.snapshotRepository = snapshotRepository;
        this.policy = policy;
    }

    /** @param recorded how many signals landed, @param dropped how many were refused */
    public record IngestResult(int recorded, int dropped) {
    }

    public record SnapshotResult(boolean stored, int reason) {
    }

    /**
     * Records the signals the browser observed during an open attempt.
     *
     * @param requestUserAgent the header Spring saw on this call, compared with the one captured at
     *                         draw time; a change means the attempt is no longer one browser.
     */
    @Transactional
    public IngestResult record(ExamAttempt attempt, List<ProctorEventRequest> events, String requestUserAgent) {
        if (events == null || events.isEmpty()) {
            return new IngestResult(0, 0);
        }
        int dropped = 0;
        List<ExamProctorEvent> accepted = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        Set<String> alreadyStored = existingKinds(attempt.getId());
        long stored = eventRepository.countByAttemptId(attempt.getId());
        boolean overflowAdded = false;
        boolean skewAdded = false;

        for (ProctorEventRequest candidate : events) {
            ProctorSignal signal = resolve(candidate == null ? null : candidate.getKind());
            if (signal == null) {
                dropped++;
                continue;
            }
            if (stored + accepted.size() >= policy.maxEventsPerAttempt()) {
                // The cap covers the signals themselves; the single marker that says the cap was hit
                // sits just outside it, because a silently truncated record helps nobody reading it.
                dropped++;
                if (!overflowAdded && !alreadyStored.contains(ProctorSignal.EVENT_OVERFLOW.name())) {
                    accepted.add(row(attempt, ProctorSignal.EVENT_OVERFLOW, null, now, null));
                    overflowAdded = true;
                }
                continue;
            }
            accepted.add(row(attempt, signal, candidate.getDetail(), now, candidate.getClientReportedAt()));
            if (!skewAdded && isSkewed(candidate.getClientReportedAt(), now)
                    && !alreadyStored.contains(ProctorSignal.CLOCK_SKEW.name())) {
                accepted.add(row(attempt, ProctorSignal.CLOCK_SKEW,
                        "Browser claimed " + candidate.getClientReportedAt() + "; the server saw " + now + ".",
                        now, candidate.getClientReportedAt()));
                skewAdded = true;
            }
        }

        if (attempt.getUserAgent() != null && requestUserAgent != null
                && !attempt.getUserAgent().equals(requestUserAgent)
                && !alreadyStored.contains(ProctorSignal.USER_AGENT_CHANGED.name())) {
            accepted.add(row(attempt, ProctorSignal.USER_AGENT_CHANGED, trim(requestUserAgent), now, null));
        }

        if (accepted.isEmpty()) {
            return new IngestResult(0, dropped);
        }
        eventRepository.saveAll(accepted);
        applyWeight(attempt, accepted);
        return new IngestResult(accepted.size(), dropped);
    }

    /** A signal the server decided for itself, such as a submit that beat the clock. */
    @Transactional
    public void recordServer(ExamAttempt attempt, ProctorSignal signal, String detail) {
        ExamProctorEvent row = row(attempt, signal, detail, LocalDateTime.now(), null);
        eventRepository.save(row);
        applyWeight(attempt, List.of(row));
    }

    public boolean hasRecorded(Long attemptId, ProctorSignal signal) {
        return existingKinds(attemptId).contains(signal.name());
    }

    private Set<String> existingKinds(Long attemptId) {
        Set<String> kinds = new HashSet<>();
        for (ExamProctorEvent event : eventRepository.findByAttemptIdOrderByServerReceivedAtAsc(attemptId)) {
            kinds.add(event.getKind());
        }
        return kinds;
    }

    public List<ProctorEventView> timeline(Long attemptId) {
        List<ProctorEventView> views = new ArrayList<>();
        for (ExamProctorEvent event : eventRepository.findByAttemptIdOrderByServerReceivedAtAsc(attemptId)) {
            ProctorSignal signal = resolve(event.getKind());
            views.add(new ProctorEventView(
                    event.getId(),
                    event.getKind(),
                    signal == null ? event.getKind() : signal.label(),
                    event.getSeverity(),
                    signal == null ? 0 : signal.points(),
                    event.getDetail(),
                    event.getServerReceivedAt(),
                    event.getClientReportedAt(),
                    event.getElapsedSeconds()));
        }
        return views;
    }

    public List<SnapshotView> snapshots(Long attemptId) {
        List<SnapshotView> views = new ArrayList<>();
        for (ExamSnapshot snapshot : snapshotRepository.findByAttemptIdOrderByServerReceivedAtAsc(attemptId)) {
            views.add(new SnapshotView(snapshot.getId(), snapshot.getLabel(),
                    snapshot.getServerReceivedAt(), snapshot.getImageDataUrl()));
        }
        return views;
    }

    /**
     * Stores one consented frame.
     *
     * @return false when the attempt is already full of frames or the payload is not a bounded
     *         image data URL, both of which a candidate's own page could otherwise weaponise to
     *         fill the database.
     */
    @Transactional
    public boolean storeSnapshot(ExamAttempt attempt, String label, String imageDataUrl) {
        if (imageDataUrl == null || imageDataUrl.length() > policy.maxSnapshotChars()
                || !isImagePayload(imageDataUrl)) {
            return false;
        }
        if (snapshotRepository.countByAttemptId(attempt.getId()) >= policy.maxSnapshotsPerAttempt()) {
            return false;
        }
        ExamSnapshot snapshot = new ExamSnapshot();
        snapshot.setAttemptId(attempt.getId());
        snapshot.setUserId(attempt.getUserId());
        snapshot.setLabel(label == null || label.isBlank() ? "PERIODIC" : trim(label));
        snapshot.setServerReceivedAt(LocalDateTime.now());
        snapshot.setImageDataUrl(imageDataUrl);
        snapshotRepository.save(snapshot);
        return true;
    }

    public long countSnapshots(Long attemptId) {
        return snapshotRepository.countByAttemptId(attemptId);
    }

    /**
     * Whether the payload really is a picture.
     *
     * The MIME type a frame declares travels in the same body the candidate controls, so the bytes
     * themselves decide. Without this, any base64 blob would be filed as a "frame" and then shown to
     * a reviewer as a broken image in the middle of the evidence they are being asked to weigh.
     */
    private boolean isImagePayload(String dataUrl) {
        int separator = dataUrl.indexOf(";base64,");
        if (!dataUrl.startsWith("data:image/") || separator < 0) {
            return false;
        }
        String payload = dataUrl.substring(separator + ";base64,".length()).trim();
        int take = Math.min(payload.length(), 16) - Math.min(payload.length(), 16) % 4;
        if (take < 8) {
            return false;
        }
        byte[] head;
        try {
            head = Base64.getDecoder().decode(payload.substring(0, take));
        } catch (IllegalArgumentException notBase64) {
            return false;
        }
        return startsWith(head, JPEG) || startsWith(head, PNG) || startsWith(head, GIF)
                || (head.length >= 12 && startsWith(head, RIFF) && startsWithAt(head, 8, WEBP));
    }

    private static boolean startsWith(byte[] head, byte[] signature) {
        return startsWithAt(head, 0, signature);
    }

    private static boolean startsWithAt(byte[] head, int offset, byte[] signature) {
        if (head.length < offset + signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (head[offset + i] != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private ExamProctorEvent row(ExamAttempt attempt, ProctorSignal signal, String detail, LocalDateTime now,
                                 LocalDateTime clientClaim) {
        ExamProctorEvent event = new ExamProctorEvent();
        event.setAttemptId(attempt.getId());
        event.setUserId(attempt.getUserId());
        event.setCourseId(attempt.getCourseId());
        event.setKind(signal.name());
        event.setSeverity(signal.severity().name());
        event.setDetail(trim(detail));
        event.setServerReceivedAt(now);
        // Kept as what the browser asserted, never as when the event happened.
        event.setClientReportedAt(clientClaim);
        if (attempt.getStartedAt() != null) {
            event.setElapsedSeconds(Math.max(0, Duration.between(attempt.getStartedAt(), now).getSeconds()));
        }
        return event;
    }

    /** Adds this batch's weight to the attempt and re-derives the verdict, which never softens on its own. */
    private void applyWeight(ExamAttempt attempt, List<ExamProctorEvent> batch) {
        int addedEvents = 0;
        int addedPoints = 0;
        for (ExamProctorEvent event : batch) {
            ProctorSignal signal = resolve(event.getKind());
            if (signal == null || !signal.counts()) {
                continue;
            }
            addedEvents++;
            addedPoints += signal.points();
        }
        if (addedPoints == 0 && addedEvents == 0) {
            return;
        }
        attempt.setViolationCount(attempt.getViolationCount() + addedEvents);
        attempt.setViolationPoints(attempt.getViolationPoints() + addedPoints);
        attempt.setIntegrity(worseOf(attempt.getIntegrity(), policy.verdictFor(attempt.getViolationPoints())));
    }

    /** A browser clock more than this far from the server's is worth a reviewer's eye. */
    private static final Duration CLOCK_TOLERANCE = Duration.ofMinutes(5);

    private static boolean isSkewed(LocalDateTime clientClaim, LocalDateTime serverNow) {
        return clientClaim != null
                && Duration.between(clientClaim, serverNow).abs().compareTo(CLOCK_TOLERANCE) > 0;
    }

    static String worseOf(String current, String proposed) {
        int currentRank = rank(current);
        int proposedRank = rank(proposed);
        return proposedRank > currentRank ? proposed : current;
    }

    private static int rank(String integrity) {
        if (ExamAttempt.INTEGRITY_FLAGGED.equalsIgnoreCase(integrity)) {
            return 2;
        }
        if (ExamAttempt.INTEGRITY_REVIEW.equalsIgnoreCase(integrity)) {
            return 1;
        }
        return 0;
    }

    private static ProctorSignal resolve(String kind) {
        if (kind == null || kind.isBlank()) {
            return null;
        }
        try {
            return ProctorSignal.valueOf(kind.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            log.debug("Ignoring unknown proctor signal '{}'.", kind);
            return null;
        }
    }

    private static String trim(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.length() <= DETAIL_LIMIT ? cleaned : cleaned.substring(0, DETAIL_LIMIT);
    }
}

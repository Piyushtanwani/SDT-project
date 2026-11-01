package com.elearning;

import com.elearning.models.ExamAttempt;
import com.elearning.models.ExamProctorEvent;
import com.elearning.models.ExamSnapshot;
import com.elearning.repositories.ExamProctorEventRepository;
import com.elearning.repositories.ExamSnapshotRepository;
import com.elearning.response_request.ProctorEventRequest;
import com.elearning.response_request.ProctorEventView;
import com.elearning.services.ExamPolicy;
import com.elearning.services.ExamProctorService;
import com.elearning.services.ProctorSignal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.stubbing.Answer;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The candidate's page names a signal; the server decides what it is worth, what it is called and
 * when it happened. These tests are the difference between a proctoring record and a confession
 * box that anyone can fill in with whatever they like.
 */
class ExamProctorServiceTest {

    private static final Long ATTEMPT_ID = 42L;
    private static final Long USER_ID = 7L;
    private static final Long COURSE_ID = 1L;
    private static final String UA = "Mozilla/5.0 (Macintosh) TestBrowser";

    private ExamProctorEventRepository events;
    private ExamSnapshotRepository snapshots;
    private List<ExamProctorEvent> eventLog;
    private List<ExamSnapshot> snapshotLog;
    private ExamProctorService service;
    private ExamPolicy policy;

    @BeforeEach
    void setUp() {
        eventLog = new ArrayList<>();
        snapshotLog = new ArrayList<>();
        events = mock(ExamProctorEventRepository.class);
        snapshots = mock(ExamSnapshotRepository.class);
        when(events.findByAttemptIdOrderByServerReceivedAtAsc(anyLong())).thenAnswer(countedOfAttempt());
        when(events.countByAttemptId(anyLong())).thenAnswer(invocation ->
                eventLog.stream().filter(e -> invocation.getArgument(0).equals(e.getAttemptId())).count());
        when(events.save(any(ExamProctorEvent.class))).thenAnswer(invocation -> {
            ExamProctorEvent event = invocation.getArgument(0);
            event.setId((long) eventLog.size() + 1);
            eventLog.add(event);
            return event;
        });
        when(events.saveAll(any())).thenAnswer(invocation -> {
            List<ExamProctorEvent> batch = invocation.getArgument(0);
            for (ExamProctorEvent event : batch) {
                event.setId((long) eventLog.size() + 1);
                eventLog.add(event);
            }
            return batch;
        });
        when(snapshots.findByAttemptIdOrderByServerReceivedAtAsc(anyLong())).thenAnswer(invocation -> {
            Long attemptId = invocation.getArgument(0);
            return snapshotLog.stream().filter(sp -> attemptId.equals(sp.getAttemptId())).toList();
        });
        when(snapshots.countByAttemptId(anyLong())).thenAnswer(invocation ->
                snapshotLog.stream().filter(s -> invocation.getArgument(0).equals(s.getAttemptId())).count());
        when(snapshots.save(any(ExamSnapshot.class))).thenAnswer(invocation -> {
            ExamSnapshot snapshot = invocation.getArgument(0);
            snapshot.setId((long) snapshotLog.size() + 1);
            snapshotLog.add(snapshot);
            return snapshot;
        });

        policy = new ExamPolicy(40, 90, 3, 6, 120, 6, 3, 400, 15, 200);
        service = new ExamProctorService(events, snapshots, policy);
    }

    private Answer<List<ExamProctorEvent>> countedOfAttempt() {
        return invocation -> {
            Long attemptId = invocation.getArgument(0);
            List<ExamProctorEvent> owned = new ArrayList<>();
            eventLog.stream().filter(e -> attemptId.equals(e.getAttemptId())).forEach(owned::add);
            return owned;
        };
    }

    private static ExamAttempt attempt() {
        ExamAttempt attempt = new ExamAttempt();
        attempt.setId(ATTEMPT_ID);
        attempt.setUserId(USER_ID);
        attempt.setCourseId(COURSE_ID);
        attempt.setStatus(ExamAttempt.STATUS_IN_PROGRESS);
        attempt.setIntegrity(ExamAttempt.INTEGRITY_CLEAN);
        attempt.setStartedAt(LocalDateTime.now().minusMinutes(10));
        attempt.setUserAgent(UA);
        return attempt;
    }

    private static ProctorEventRequest event(String kind, String detail) {
        ProctorEventRequest request = new ProctorEventRequest();
        request.setKind(kind);
        request.setDetail(detail);
        return request;
    }

    /** The same signal with the browser's own timestamp attached, which is only ever a claim. */
    private static ProctorEventRequest claimedAt(LocalDateTime clientTime, String kind) {
        ProctorEventRequest request = event(kind, null);
        request.setClientReportedAt(clientTime);
        return request;
    }

    private static List<ProctorEventRequest> eventsOf(String... kinds) {
        List<ProctorEventRequest> requests = new ArrayList<>();
        for (String kind : kinds) {
            requests.add(event(kind, null));
        }
        return requests;
    }

    private List<String> kinds() {
        return eventLog.stream().map(ExamProctorEvent::getKind).toList();
    }

    @Test
    @DisplayName("The server sets the severity, the label and the time — not the browser")
    void severityAndTimeAreServerDecided() {
        ExamAttempt attempt = attempt();
        LocalDateTime before = LocalDateTime.now();

        service.record(attempt, List.of(event("paste", "ctrl+v")), UA);

        assertEquals(1, eventLog.size());
        ExamProctorEvent row = eventLog.get(0);
        assertEquals(ProctorSignal.PASTE.name(), row.getKind());
        assertEquals("HIGH", row.getSeverity(), "the weight comes from the catalogue, not the payload");
        assertEquals(ATTEMPT_ID, row.getAttemptId());
        assertEquals(USER_ID, row.getUserId());
        assertEquals(COURSE_ID, row.getCourseId());
        assertFalse(row.getServerReceivedAt().isBefore(before));
        assertTrue(row.getElapsedSeconds() >= 590 && row.getElapsedSeconds() <= 610,
                "elapsed time is measured from the server's own start stamp");
        assertNotEquals(LocalDateTime.of(1999, 1, 1, 0, 0), row.getServerReceivedAt());
        assertEquals(ProctorSignal.PASTE.label(), service.timeline(ATTEMPT_ID).get(0).label());
    }

    @Test
    @DisplayName("Unknown, blank and null signals are dropped rather than stored")
    void unknownSignalsAreRefused() {
        ExamAttempt attempt = attempt();

        ExamProctorService.IngestResult result = service.record(attempt,
                List.of(event("SOMETHING_MADE_UP", null), event(null, null), event("  ", null),
                        event("paste", null)), UA);

        assertEquals(3, result.dropped());
        assertEquals(1, result.recorded());
        assertEquals(List.of("PASTE"), kinds());
    }

    @Test
    @DisplayName("Signals are case and space insensitive so a sloppy payload cannot hide a violation")
    void kindsResolveLoosely() {
        service.record(attempt(), List.of(event("  tab_hidden  ", null)), UA);

        assertEquals(List.of("TAB_HIDDEN"), kinds());
    }

    @Test
    @DisplayName("Each severity is worth its documented weight and the verdict rises with the points")
    void weightingDrivesTheVerdict() {
        ExamAttempt attempt = attempt();

        service.record(attempt, eventsOf("text_selection"), UA);
        assertEquals(1, attempt.getViolationPoints(), "LOW is worth 1");
        assertEquals(ExamAttempt.INTEGRITY_CLEAN, attempt.getIntegrity());

        service.record(attempt, eventsOf("copy"), UA);
        assertEquals(3, attempt.getViolationPoints(), "MEDIUM is worth 2");
        assertEquals(ExamAttempt.INTEGRITY_REVIEW, attempt.getIntegrity());

        service.record(attempt, eventsOf("paste"), UA);
        assertEquals(6, attempt.getViolationPoints(), "HIGH is worth 3");
        assertEquals(ExamAttempt.INTEGRITY_FLAGGED, attempt.getIntegrity());
    }

    @Test
    @DisplayName("Advisory signals are recorded but cost the candidate nothing")
    void nonCountingSignalsDoNotWeight() {
        ExamAttempt attempt = attempt();

        service.record(attempt, eventsOf("heartbeat", "heartbeat", "camera_denied"), UA);

        assertEquals(3, eventLog.size());
        assertEquals(0, attempt.getViolationPoints());
        assertEquals(0, attempt.getViolationCount());
        assertEquals(ExamAttempt.INTEGRITY_CLEAN, attempt.getIntegrity());
    }

    @Test
    @DisplayName("A verdict earned once cannot be talked back down by quieter behaviour")
    void verdictNeverSoftens() {
        ExamAttempt attempt = attempt();
        service.record(attempt, eventsOf("paste", "paste"), UA);
        assertEquals(ExamAttempt.INTEGRITY_FLAGGED, attempt.getIntegrity());

        service.record(attempt, eventsOf("heartbeat"), UA);

        assertEquals(ExamAttempt.INTEGRITY_FLAGGED, attempt.getIntegrity());
    }

    @Test
    @DisplayName("An attempt only holds the documented number of signals, then says so once")
    void eventCapAddsOneOverflowMarker() {
        policy = new ExamPolicy(40, 90, 3, 6, 120, 6, 3, 3, 15, 200);
        service = new ExamProctorService(events, snapshots, policy);
        ExamAttempt attempt = attempt();

        ExamProctorService.IngestResult first = service.record(attempt, eventsOf("copy", "copy", "copy", "copy"), UA);

        assertEquals(3, kinds().stream().filter("COPY"::equals).count(), "the cap holds the signals");
        assertEquals(1, first.dropped());
        assertTrue(kinds().contains("EVENT_OVERFLOW"));
        assertEquals(1, kinds().stream().filter("EVENT_OVERFLOW"::equals).count());

        service.record(attempt, eventsOf("copy"), UA);
        assertEquals(1, kinds().stream().filter("EVENT_OVERFLOW"::equals).count(),
                "a full attempt must not collect a new marker with every further batch");
    }

    @Test
    @DisplayName("Traffic from a different browser mid-attempt is noticed, and noticed once")
    void userAgentChangeIsRecordedOnce() {
        ExamAttempt attempt = attempt();

        service.record(attempt, eventsOf("copy"), "curl/8.4.0");
        service.record(attempt, eventsOf("copy"), "curl/8.4.0");

        assertEquals(1, kinds().stream().filter("USER_AGENT_CHANGED"::equals).count(),
                "the same foreign client must not generate a wall of identical rows");
        assertTrue(kinds().contains("USER_AGENT_CHANGED"));
    }

    @Test
    @DisplayName("The same browser as the attempt started in is not a violation")
    void matchingUserAgentIsSilent() {
        service.record(attempt(), eventsOf("copy"), UA);

        assertFalse(kinds().contains("USER_AGENT_CHANGED"));
    }

    @Test
    @DisplayName("A missing header on the event call is not evidence of anything")
    void absentUserAgentIsIgnored() {
        service.record(attempt(), eventsOf("copy"), null);

        assertFalse(kinds().contains("USER_AGENT_CHANGED"));
    }

    @Test
    @DisplayName("Server-decided signals land on the same timeline with the same weight")
    void serverSignalsAreRecorded() {
        ExamAttempt attempt = attempt();

        service.recordServer(attempt, ProctorSignal.TOKEN_REPLAY, "token from attempt 99");

        assertEquals(List.of("TOKEN_REPLAY"), kinds());
        assertEquals(3, attempt.getViolationPoints());
        assertEquals("token from attempt 99", eventLog.get(0).getDetail());
        assertTrue(service.hasRecorded(ATTEMPT_ID, ProctorSignal.TOKEN_REPLAY));
        assertFalse(service.hasRecorded(ATTEMPT_ID, ProctorSignal.PASTE));
    }

    @Test
    @DisplayName("The browser's own timestamp is kept as a claim, never as the time of the event")
    void clientClaimsAreStoredButNotBelieved() {
        LocalDateTime bogus = LocalDateTime.of(1999, 1, 1, 0, 0);

        service.record(attempt(), List.of(claimedAt(bogus, "paste")), UA);

        ProctorEventView row = service.timeline(ATTEMPT_ID).get(0);
        assertEquals(bogus, row.clientReportedAt());
        assertTrue(row.serverReceivedAt().getYear() > 2020,
                "ordering, weighting and the reviewer's timeline all follow the server stamp");
    }

    @Test
    @DisplayName("A clock hours off the server's is noticed once, not on every signal")
    void clockSkewIsReportedOnce() {
        LocalDateTime bogus = LocalDateTime.now().minusHours(3);

        service.record(attempt(), List.of(claimedAt(bogus, "paste"), claimedAt(bogus, "copy")), UA);
        service.record(attempt(), List.of(claimedAt(bogus, "paste")), UA);

        assertEquals(1, kinds().stream().filter("CLOCK_SKEW"::equals).count());
    }

    @Test
    @DisplayName("A browser clock within a few minutes of the server is not a violation")
    void smallClockOffsetsAreTolerated() {
        service.record(attempt(), List.of(claimedAt(LocalDateTime.now().minusMinutes(2), "paste")), UA);

        assertFalse(kinds().contains("CLOCK_SKEW"));
    }

    @Test
    @DisplayName("Oversized details are trimmed instead of filling the database")
    void detailIsBounded() {
        service.record(attempt(), List.of(event("paste", "x".repeat(5000))), UA);

        assertEquals(500, eventLog.get(0).getDetail().length());
    }

    @Test
    @DisplayName("The timeline a candidate is shown matches the reviewer's order and labels")
    void timelineIsOrderedAndLabelled() {
        ExamAttempt attempt = attempt();
        service.record(attempt, eventsOf("paste", "tab_hidden"), UA);

        List<ProctorEventView> timeline = service.timeline(ATTEMPT_ID);

        assertEquals(List.of("PASTE", "TAB_HIDDEN"), timeline.stream().map(ProctorEventView::kind).toList());
        assertEquals(ProctorSignal.PASTE.label(), timeline.get(0).label());
    }

    @Test
    @DisplayName("Only a bounded image frame is stored, and its label defaults to something readable")
    void snapshotsAreValidated() {
        ExamAttempt attempt = attempt();

        assertTrue(service.storeSnapshot(attempt, null, "data:image/jpeg;base64,/9j/AAAA"));
        assertTrue(service.storeSnapshot(attempt, "START", "data:image/png;base64,iVBORw0KGg"));

        assertEquals(2, snapshotLog.size());
        assertEquals("PERIODIC", snapshotLog.get(0).getLabel());
        assertEquals("START", snapshotLog.get(1).getLabel());
        assertNotNull(snapshotLog.get(0).getServerReceivedAt());
        assertEquals(USER_ID, snapshotLog.get(0).getUserId());
    }

    @Test
    @DisplayName("Non-images, oversize payloads and empty payloads are refused outright")
    void hostileSnapshotPayloadsAreRefused() {
        ExamAttempt attempt = attempt();

        assertFalse(service.storeSnapshot(attempt, "x", null));
        assertFalse(service.storeSnapshot(attempt, "x", ""));
        assertFalse(service.storeSnapshot(attempt, "x", "<script>alert(1)</script>"),
                "a data URL is the only thing this endpoint accepts");
        assertFalse(service.storeSnapshot(attempt, "x", "data:text/html;base64,PHNjcmlwdD4="));
        assertFalse(service.storeSnapshot(attempt, "x", "data:image/jpeg;base64,VEhJUyBJUyBOTyBJTUFHRSBhdCBhbGw="),
                "the bytes decide, not the MIME type the page declared");
        assertFalse(service.storeSnapshot(attempt, "x", "data:image/png;base64," + "A".repeat(policy.maxSnapshotChars())));
        assertTrue(snapshotLog.isEmpty());
    }

    @Test
    @DisplayName("A page cannot fill the database with frames: the per-attempt cap holds")
    void snapshotCapHolds() {
        policy = new ExamPolicy(40, 90, 3, 6, 120, 6, 3, 400, 2, 200);
        service = new ExamProctorService(events, snapshots, policy);
        ExamAttempt attempt = attempt();

        assertTrue(service.storeSnapshot(attempt, "a", "data:image/jpeg;base64,/9j/AAAA"));
        assertTrue(service.storeSnapshot(attempt, "b", "data:image/jpeg;base64,/9j/AAAA"));
        assertFalse(service.storeSnapshot(attempt, "c", "data:image/jpeg;base64,/9j/AAAA"));
        assertEquals(2, snapshotLog.size());
    }

    @Test
    @DisplayName("Snapshot views carry what the admin console needs and nothing else")
    void snapshotViewsAreSafe() {
        service.storeSnapshot(attempt(), "START", "data:image/jpeg;base64,/9j/AAAA");

        assertEquals(1, service.snapshots(ATTEMPT_ID).size());
        assertEquals("START", service.snapshots(ATTEMPT_ID).get(0).label());
        assertEquals(1, service.countSnapshots(ATTEMPT_ID));
        assertEquals(0, service.countSnapshots(999L));
        assertNull(service.snapshots(999L).stream().findFirst().orElse(null));
    }
}

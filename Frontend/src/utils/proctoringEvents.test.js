import fs from "fs";
import path from "path";
import {
  OBSERVABLE,
  POINTS,
  NON_COUNTING_KINDS,
  createProctorLog,
  isKnown,
  keySignalFor,
  clockOffsetMs,
  localTimestamp,
  parseLocalIso,
  pointsOf,
  remainingSeconds,
} from "./proctoringEvents";

const SERVER_CATALOGUE = path.join(
  __dirname,
  "../../../Backend/src/main/java/com/elearning/services/ProctorSignal.java"
);

function serverSignals() {
  if (!fs.existsSync(SERVER_CATALOGUE)) {
    return null;
  }
  const source = fs.readFileSync(SERVER_CATALOGUE, "utf8");
  const rows = new Map();
  const pattern = /^\s*([A-Z][A-Z_]+)\(ExamSeverity\.(\w+),\s*(true|false)/gm;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    rows.set(match[1], { severity: match[2], counts: match[3] === "true" });
  }
  return rows;
}

describe("the browser's signal table matches the server's catalogue", () => {
  const signals = serverSignals();

  (signals ? it : it.skip)("every kind the page reports is one the server knows", () => {
    Object.keys(OBSERVABLE).forEach((kind) => {
      expect(signals.has(kind)).toBe(true);
    });
  });

  (signals ? it : it.skip)("every kind carries the weight the server gives it", () => {
    Object.keys(OBSERVABLE).forEach((kind) => {
      const server = signals.get(kind);
      expect(server.severity).toBe(OBSERVABLE[kind].severity);
      expect(server.counts).toBe(OBSERVABLE[kind].counts !== false);
    });
  });

  it("points follow severity, and a signal that does not count is worth nothing", () => {
    expect(POINTS.HIGH).toBe(3);
    expect(pointsOf("TAB_HIDDEN")).toBe(3);
    expect(pointsOf("COPY")).toBe(2);
    expect(pointsOf("TEXT_SELECTION")).toBe(1);
    expect(NON_COUNTING_KINDS.length).toBeGreaterThan(0);
    NON_COUNTING_KINDS.forEach((kind) => expect(pointsOf(kind)).toBe(0));
  });

  it("a kind the server has never heard of is refused rather than sent", () => {
    expect(isKnown("MADE_UP_SIGNAL")).toBe(false);
    expect(pointsOf("MADE_UP_SIGNAL")).toBe(0);
  });
});

describe("the live record a candidate watches", () => {
  it("adds weight as it goes and steps through the same thresholds as the verdict", () => {
    let clock = 0;
    const log = createProctorLog({ now: () => clock, dedupeMs: 2000 });

    clock += 5000;
    expect(log.observe("TEXT_SELECTION")).not.toBeNull();
    expect(log.points()).toBe(1);
    expect(log.level()).toBe("clear");

    clock += 5000;
    log.observe("COPY");
    expect(log.points()).toBe(3);
    expect(log.level()).toBe("watch");

    clock += 5000;
    log.observe("TAB_HIDDEN");
    expect(log.level()).toBe("flag");

    clock += 5000;
    log.observe("PASTE");
    log.observe("DEVTOOLS_KEY");
    expect(log.level()).toBe("flag");

    clock += 5000;
    log.observe("FULLSCREEN_EXIT");
    log.observe("PRINT_OR_SAVE");
    expect(log.points()).toBe(18);
    expect(log.level()).toBe("stop");
  });

  it("counts one alt-tab once, not as three separate sightings", () => {
    let clock = 0;
    const log = createProctorLog({ now: () => clock, dedupeMs: 2000 });

    log.observe("WINDOW_BLUR");
    clock += 120;
    expect(log.observe("WINDOW_BLUR")).toBeNull();
    clock += 120;
    expect(log.observe("TAB_HIDDEN")).not.toBeNull();
    clock += 120;
    expect(log.observe("WINDOW_BLUR")).toBeNull();

    expect(log.points()).toBe(5);
    expect(log.counts()).toEqual({ WINDOW_BLUR: 1, TAB_HIDDEN: 1 });
  });

  it("gives the same kind a second chance once the dedupe window has passed", () => {
    let clock = 0;
    const log = createProctorLog({ now: () => clock, dedupeMs: 2000 });
    log.observe("COPY");
    clock += 2500;
    expect(log.observe("COPY")).not.toBeNull();
    expect(log.points()).toBe(4);
  });

  it("keeps signalling after the panel has forgotten the oldest sightings", () => {
    let clock = 0;
    const log = createProctorLog({ now: () => clock, dedupeMs: 10, maxEntries: 3 });
    ["COPY", "TEXT_SELECTION", "DRAG", "FORBIDDEN_KEY", "PRINT_SCREEN"].forEach((kind) => {
      clock += 100;
      log.observe(kind);
    });

    expect(log.entries()).toHaveLength(3);
    expect(log.points()).toBe(2 + 1 + 1 + 2 + 2);
    expect(log.level()).toBe("flag");
  });

  it("sends every sighting once, then waits for more", () => {
    const log = createProctorLog({ dedupeMs: 0 });
    log.observe("TAB_HIDDEN", "hidden for 6s");
    log.observe("COPY");

    const first = log.drain();
    expect(first.map((event) => event.kind)).toEqual(["TAB_HIDDEN", "COPY"]);
    expect(first[0].detail).toBe("hidden for 6s");
    expect(first[0].clientReportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(log.pending()).toBe(0);
    expect(log.drain()).toEqual([]);

    log.observe("PASTE");
    expect(log.pending()).toBe(1);
  });

  it("never reports a kind the server would drop, so the panel cannot show a phantom offence", () => {
    const log = createProctorLog({ dedupeMs: 0 });
    expect(log.observe("NOT_A_SIGNAL")).toBeNull();
    expect(log.observe(null)).toBeNull();
    expect(log.observe("")).toBeNull();
    expect(log.pending()).toBe(0);
    expect(log.level()).toBe("clear");
  });

  it("lets a declined camera be recorded without touching the verdict", () => {
    const log = createProctorLog({ dedupeMs: 0 });
    log.observe("HEARTBEAT");
    log.observe("CAMERA_DENIED");
    expect(log.entries()).toHaveLength(2);
    expect(log.points()).toBe(0);
    expect(log.level()).toBe("clear");
  });
});

describe("what a keystroke means", () => {
  it("names the developer-tools shortcuts", () => {
    expect(keySignalFor({ key: "F12" })).toBe("DEVTOOLS_KEY");
    expect(keySignalFor({ key: "I", ctrlKey: true, shiftKey: true })).toBe("DEVTOOLS_KEY");
    expect(keySignalFor({ key: "j", ctrlKey: true, shiftKey: true })).toBe("DEVTOOLS_KEY");
    expect(keySignalFor({ key: "c", metaKey: true, shiftKey: true })).toBe("DEVTOOLS_KEY");
  });

  it("names print, save and the screenshot key", () => {
    expect(keySignalFor({ key: "p", ctrlKey: true })).toBe("PRINT_OR_SAVE");
    expect(keySignalFor({ key: "s", metaKey: true })).toBe("PRINT_OR_SAVE");
    expect(keySignalFor({ key: "PrintScreen" })).toBe("PRINT_SCREEN");
  });

  it("names the clipboard and view-source shortcuts", () => {
    expect(keySignalFor({ key: "c", ctrlKey: true })).toBe("FORBIDDEN_KEY");
    expect(keySignalFor({ key: "v", metaKey: true })).toBe("FORBIDDEN_KEY");
    expect(keySignalFor({ key: "x", ctrlKey: true })).toBe("FORBIDDEN_KEY");
    expect(keySignalFor({ key: "u", ctrlKey: true })).toBe("FORBIDDEN_KEY");
  });

  it("leaves ordinary typing, navigation and the exam's own shortcuts alone", () => {
    expect(keySignalFor({ key: "a" })).toBeNull();
    expect(keySignalFor({ key: "ArrowRight" })).toBeNull();
    expect(keySignalFor({ key: "Tab" })).toBeNull();
    expect(keySignalFor({ key: "1" })).toBeNull();
    expect(keySignalFor({})).toBeNull();
    expect(keySignalFor(null)).toBeNull();
  });

  it("only calls a shortcut when the modifier really went with it", () => {
    expect(keySignalFor({ key: "i" })).toBeNull();
    expect(keySignalFor({ key: "i", ctrlKey: true })).toBeNull();
    expect(keySignalFor({ key: "p" })).toBeNull();
  });
});

describe("the countdown the page shows", () => {
  it("reads a server timestamp as local time", () => {
    const epoch = parseLocalIso("2026-11-01T18:34:06.699");
    const date = new Date(epoch);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10);
    expect(date.getDate()).toBe(1);
    expect(date.getHours()).toBe(18);
    expect(date.getMinutes()).toBe(34);
    expect(date.getSeconds()).toBe(6);
    expect(date.getMilliseconds()).toBe(699);
  });

  it("tolerates a plain second-precision stamp and rejects junk", () => {
    expect(parseLocalIso("2026-11-01T18:34:06")).not.toBeNull();
    expect(parseLocalIso("2026-11-01T18:34")).not.toBeNull();
    expect(parseLocalIso(null)).toBeNull();
    expect(parseLocalIso("not a time")).toBeNull();
  });

  it("measures the clock from the server's time, not the machine's", () => {
    const localAtRequest = 1_000_000;
    const serverSaid = parseLocalIso("2026-11-01T18:34:06.699");
    expect(clockOffsetMs("2026-11-01T18:34:06.699", localAtRequest)).toBe(serverSaid - localAtRequest);
    expect(clockOffsetMs(null, localAtRequest)).toBe(0);

    const deadline = localTimestamp(new Date(1_000_000 + 1000 * 90));
    expect(remainingSeconds(deadline, 0, 1_000_000)).toBe(90);
    expect(remainingSeconds(deadline, 0, 1_000_000 + 45_000)).toBe(45);
    expect(remainingSeconds(deadline, 0, 1_000_000 + 120_000)).toBe(0);
    expect(remainingSeconds("garbage", 0)).toBeNull();
  });

  it("stamps claims the way the server writes them", () => {
    expect(localTimestamp(new Date(2026, 10, 1, 8, 5, 3, 7))).toBe("2026-11-01T08:05:03.007");
  });
});

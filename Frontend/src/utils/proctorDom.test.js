import { createProctorLog } from "./proctoringEvents";
import { createProctorWatcher } from "./proctorDom";

/**
 * The watcher is exercised against plain EventTargets: what matters is which signals a browser
 * fact turns into, that the easy tricks are refused, and that a departure is not counted twice.
 */
function fakeWindow() {
  const win = new EventTarget();
  win.setInterval = (fn, ms) => setInterval(fn, ms);
  win.clearInterval = (id) => clearInterval(id);
  win.getSelection = () => ({ toString: () => "" });
  return win;
}

function fakeDocument() {
  const doc = new EventTarget();
  doc.visibilityState = "visible";
  doc.fullscreenElement = null;
  return doc;
}

function fire(target, type, props = {}) {
  const event = new Event(type, { cancelable: true, bubbles: false });
  Object.assign(event, props);
  target.dispatchEvent(event);
  return event;
}

function setup(overrides = {}) {
  const log = createProctorLog({ dedupeMs: 0 });
  const win = fakeWindow();
  const doc = fakeDocument();
  const flushed = [];
  const watcher = createProctorWatcher({
    log,
    win,
    doc,
    heartbeatMs: 30000,
    flushMs: 15000,
    onFlush: (batch, keepalive) => flushed.push({ batch, keepalive }),
    ...overrides,
  });
  watcher.start();
  return { log, win, doc, watcher, flushed };
}

function kinds(log) {
  return log.entries().map((entry) => entry.kind);
}

describe("what the page refuses, it also writes down", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("stops a copy and says how much left the page", () => {
    const { log, doc } = setup();
    const event = fire(doc, "copy", {
      clipboardData: { getData: () => "the whole question and all four options" },
    });

    expect(event.defaultPrevented).toBe(true);
    expect(kinds(log)).toEqual(["COPY"]);
    expect(log.entries()[0].detail).toBe("39 characters copied.");
  });

  it("stops a paste, which is the one that matters most", () => {
    const { log, doc } = setup();
    const event = fire(doc, "paste", { clipboardData: { getData: () => "A" } });

    expect(event.defaultPrevented).toBe(true);
    expect(log.entries()[0]).toMatchObject({ kind: "PASTE", severity: "HIGH", points: 3 });
  });

  it("stops a cut, a right-click and a drag", () => {
    const { log, doc } = setup();
    expect(fire(doc, "cut").defaultPrevented).toBe(true);
    expect(fire(doc, "contextmenu").defaultPrevented).toBe(true);
    expect(fire(doc, "dragstart").defaultPrevented).toBe(true);
    expect(kinds(log)).toEqual(["CUT", "CONTEXT_MENU", "DRAG"]);
  });

  it("refuses the text-selection gesture that a screenshot usually follows", () => {
    const { log, doc } = setup();
    expect(fire(doc, "selectstart").defaultPrevented).toBe(true);
    expect(kinds(log)).toEqual([]);
  });

  it("names the developer-tools, print, save and screenshot shortcuts", () => {
    const { log, doc } = setup();
    expect(fire(doc, "keydown", { key: "F12" }).defaultPrevented).toBe(true);
    fire(doc, "keydown", { key: "I", ctrlKey: true, shiftKey: true });
    fire(doc, "keydown", { key: "p", ctrlKey: true });
    fire(doc, "keydown", { key: "s", metaKey: true });
    fire(doc, "keydown", { key: "PrintScreen" });

    expect(kinds(log)).toEqual(["DEVTOOLS_KEY", "DEVTOOLS_KEY", "PRINT_OR_SAVE", "PRINT_OR_SAVE", "PRINT_SCREEN"]);
    expect(log.entries()[0].detail).toBe("Shortcut: F12.");
    expect(log.entries()[1].detail).toBe("Shortcut: Ctrl+Shift+I.");
  });

  it("leaves the exam's own keys alone", () => {
    const { log, doc } = setup();
    expect(fire(doc, "keydown", { key: "ArrowRight" }).defaultPrevented).toBe(false);
    expect(fire(doc, "keydown", { key: "2" }).defaultPrevented).toBe(false);
    expect(kinds(log)).toEqual([]);
  });

  it("records a print dialog asked for through the browser menu", () => {
    const { log, win } = setup();
    fire(win, "beforeprint");
    expect(kinds(log)).toEqual(["PRINT_OR_SAVE"]);
  });

  it("reports a page that was closed or reloaded mid-exam", () => {
    const { log, win, flushed } = setup();
    fire(win, "beforeunload");

    expect(kinds(log)).toEqual(["BEFORE_UNLOAD"]);
    expect(flushed).toHaveLength(1);
    expect(flushed[0].keepalive).toBe(true);
    expect(flushed[0].batch.map((event) => event.kind)).toEqual(["BEFORE_UNLOAD"]);
  });
});

describe("leaving the exam", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("counts hiding the tab once, even though the window blurs with it", () => {
    const { log, doc, win } = setup();
    doc.visibilityState = "hidden";
    fire(doc, "visibilitychange");
    fire(win, "blur");

    expect(kinds(log)).toEqual(["TAB_HIDDEN"]);
    expect(log.points()).toBe(3);
  });

  it("still counts a bare window blur, which is how a second monitor shows up", () => {
    const { log, win } = setup();
    fire(win, "blur");
    expect(kinds(log)).toEqual(["WINDOW_BLUR"]);
  });

  it("says how long the page was out of view when it comes back", () => {
    const { log, doc } = setup();
    doc.visibilityState = "hidden";
    fire(doc, "visibilitychange");
    jest.advanceTimersByTime(9000);
    doc.visibilityState = "visible";
    fire(doc, "visibilitychange");

    expect(log.entries()[1]).toMatchObject({ kind: "WINDOW_BLUR", detail: "Out of view for 9s." });
  });

  it("records leaving full screen", () => {
    const { log, doc } = setup();
    doc.fullscreenElement = { id: "exam" };
    doc.fullscreenElement = null;
    fire(doc, "fullscreenchange");
    expect(kinds(log)).toEqual(["FULLSCREEN_EXIT"]);
  });

  it("does not complain when full screen is entered", () => {
    const { log, doc } = setup();
    doc.fullscreenElement = { id: "exam" };
    fire(doc, "fullscreenchange");
    expect(kinds(log)).toEqual([]);
  });
});

describe("the reporting loop", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("keeps proving the page is in the foreground", () => {
    const { log } = setup();
    jest.advanceTimersByTime(30000);
    expect(kinds(log)).toEqual(["HEARTBEAT"]);
    expect(log.points()).toBe(0);
    jest.advanceTimersByTime(60000);
    expect(kinds(log)).toEqual(["HEARTBEAT", "HEARTBEAT", "HEARTBEAT"]);
  });

  it("sends what it saw and then stops sending nothing", () => {
    const { log, doc, flushed } = setup();
    fire(doc, "contextmenu");
    jest.advanceTimersByTime(15000);
    expect(flushed).toHaveLength(1);
    expect(flushed[0].batch).toHaveLength(1);

    jest.advanceTimersByTime(45000);
    const sent = flushed.flatMap((entry) => entry.batch.map((event) => event.kind));
    expect(sent).toEqual(["CONTEXT_MENU", "HEARTBEAT", "HEARTBEAT"]);
    expect(kinds(log)).toEqual(["CONTEXT_MENU", "HEARTBEAT", "HEARTBEAT"]);
  });

  it("delivers whatever is still queued when the exam is handed in", () => {
    const { log, doc, watcher, flushed } = setup();
    fire(doc, "copy", { clipboardData: { getData: () => "abc" } });
    log.observe("PASTE");
    flushed.length = 0;

    watcher.stop();

    expect(flushed).toHaveLength(1);
    expect(flushed[0].batch.map((event) => event.kind)).toEqual(["COPY", "PASTE"]);
    expect(log.pending()).toBe(0);
  });

  it("stops watching, so a finished attempt cannot keep reporting", () => {
    const { log, doc, watcher } = setup();
    watcher.stop();
    fire(doc, "contextmenu");
    fire(doc, "copy", { clipboardData: { getData: () => "abc" } });

    expect(kinds(log)).toEqual([]);
    expect(watcher.isRunning()).toBe(false);
  });
});

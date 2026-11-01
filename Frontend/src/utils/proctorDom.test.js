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
    // Most of these tests are about a single DOM fact. The full-screen budget is set on its own
    // describe, so that a 60-second clock does not close every sitting under test.
    fullscreen: { required: false },
    // A test harness only ever dispatches events, which is precisely what the synthetic detector
    // condemns in a browser — so it is switched off here and turned on by the test that needs it.
    isSynthetic: () => false,
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

describe("the wider watch", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("tells a click written by code apart from one made by a hand", () => {
    const { log, doc } = setup({ isSynthetic: (event) => event.__fromCode === true });
    fire(doc, "keydown", { key: "ArrowRight", __fromCode: true });
    fire(doc, "click", { __fromCode: true });

    expect(kinds(log)).toEqual(["SYNTHETIC_EVENT", "SYNTHETIC_EVENT"]);
    expect(log.points()).toBe(6);
  });

  it("leaves a real keystroke unaccused", () => {
    const { log, doc } = setup({ isSynthetic: (event) => event.__fromCode === true });
    fire(doc, "keydown", { key: "ArrowRight" });
    expect(kinds(log)).toEqual([]);
  });

  it("refuses a file dropped onto the exam and says what it was", () => {
    const { log, doc } = setup();
    const event = fire(doc, "drop", { dataTransfer: { files: [{ name: "answers.pdf" }] } });

    expect(event.defaultPrevented).toBe(true);
    expect(log.entries()[0]).toMatchObject({ kind: "FILE_DROPPED", severity: "HIGH", detail: "Dropped: answers.pdf." });
  });

  it("names a pasted picture, which is not the same thing as a pasted letter", () => {
    const { log, doc } = setup();
    fire(doc, "paste", { clipboardData: { getData: () => "", items: [{ kind: "file", type: "image/png" }] } });

    expect(kinds(log)).toEqual(["PASTE_IMAGE"]);
  });

  it("refuses select-all", () => {
    const { log, doc } = setup();
    expect(fire(doc, "keydown", { key: "a", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(kinds(log)).toEqual(["SELECT_ALL"]);
  });

  it("reports a connection that went away, and the way back without weight", () => {
    const { log, win } = setup();
    fire(win, "offline");
    fire(win, "online");

    expect(kinds(log)).toEqual(["NETWORK_OFFLINE", "NETWORK_RESTORED"]);
    expect(log.points()).toBe(2);
  });

  it("reads a docked panel out of the window's own measurements", () => {
    const win = Object.assign(fakeWindow(), {
      innerWidth: 1280, innerHeight: 800, outerWidth: 1280, outerHeight: 860, screenX: 100, screenY: 100,
    });
    const { log } = setup({ win });
    Object.assign(win, { innerWidth: 880 });
    fire(win, "resize");

    expect(kinds(log)).toEqual(["WINDOW_RESIZED", "DEVTOOLS_LAYOUT_HINT"]);
  });

  it("notices a window that is too small to be read, but not a phone", () => {
    const laptop = Object.assign(fakeWindow(), {
      innerWidth: 1200, innerHeight: 700, outerWidth: 1200, outerHeight: 760,
    });
    const { log } = setup({ win: laptop });
    Object.assign(laptop, { innerWidth: 420, innerHeight: 300, outerWidth: 420, outerHeight: 360 });
    fire(laptop, "resize");

    expect(kinds(log)).toEqual(["WINDOW_RESIZED", "VIEWPORT_TOO_SMALL"]);

    const phone = Object.assign(fakeWindow(), {
      innerWidth: 1200, innerHeight: 700, outerWidth: 1200, outerHeight: 760,
      matchMedia: () => ({ matches: true }),
    });
    const coarse = setup({ win: phone });
    Object.assign(phone, { innerWidth: 420, innerHeight: 300, outerWidth: 420, outerHeight: 360 });
    fire(phone, "resize");

    expect(kinds(coarse.log)).toEqual(["WINDOW_RESIZED"]);
  });

  it("sees a window dragged off the edge of the display", () => {
    const win = Object.assign(fakeWindow(), {
      innerWidth: 1200, innerHeight: 700, outerWidth: 1200, outerHeight: 760, screenX: 40, screenY: 40,
    });
    const { log } = setup({ win });
    Object.assign(win, { screenX: -400 });
    fire(win, "resize");

    expect(kinds(log)).toEqual(["WINDOW_MOVED", "OFF_SCREEN_WINDOW"]);
  });

  it("names automation software the moment the sitting starts", () => {
    const win = Object.assign(fakeWindow(), { navigator: { webdriver: true } });
    win.top = win;
    win.self = win;
    const { log } = setup({ win });

    expect(kinds(log)).toEqual(["AUTOMATION_DRIVER"]);
    expect(log.entries()[0].detail).toBe("Found navigator.webdriver.");
  });

  it("says when the exam was opened inside somebody else's page", () => {
    const win = fakeWindow();
    win.top = { different: true };
    win.self = win;
    const { log } = setup({ win });

    expect(kinds(log)).toEqual(["EMBEDDED_IN_IFRAME"]);
  });
});

describe("full screen is compulsory", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function proctenedSetup(budgetSeconds = 10) {
    const log = createProctorLog({ dedupeMs: 0 });
    const win = Object.assign(fakeWindow(), {
      innerWidth: 1280, innerHeight: 800, outerWidth: 1280, outerHeight: 860, screenX: 0, screenY: 0,
    });
    const doc = fakeDocument();
    const states = [];
    const breaches = [];
    const flushed = [];
    doc.fullscreenElement = { id: "exam" };
    const watcher = createProctorWatcher({
      log,
      win,
      doc,
      onFlush: (batch, keepalive) => flushed.push({ batch, keepalive }),
      fullscreen: {
        required: true,
        budgetSeconds,
        onState: (state) => states.push(state),
        onBreach: (seconds) => breaches.push(seconds),
      },
    });
    watcher.start();
    return { log, win, doc, watcher, states, breaches, flushed };
  }

  it("covers the paper the moment full screen goes, and uncovers it when it comes back", () => {
    const { doc, watcher, states } = proctenedSetup();
    expect(watcher.fullscreenState().covered).toBe(false);

    doc.fullscreenElement = null;
    fire(doc, "fullscreenchange");
    expect(watcher.fullscreenState().covered).toBe(true);

    doc.fullscreenElement = { id: "exam" };
    fire(doc, "fullscreenchange");
    expect(watcher.fullscreenState().covered).toBe(false);
    expect(states.map((state) => state.covered)).toEqual([false, true, false]);
  });

  it("reports one row per departure, with the seconds the paper was covered for", () => {
    const { doc, log } = proctenedSetup();
    doc.fullscreenElement = null;
    fire(doc, "fullscreenchange");
    expect(kinds(log)).toEqual([]);

    jest.advanceTimersByTime(4000);
    doc.fullscreenElement = { id: "exam" };
    fire(doc, "fullscreenchange");

    expect(log.entries()[0]).toMatchObject({
      kind: "FULLSCREEN_EXIT",
      detail: "Out of full screen for 4s.",
      outOfFullscreenSeconds: 4,
    });
  });

  it("closes the sitting once the covered time spends the budget", () => {
    const { doc, log, breaches } = proctenedSetup(10);
    doc.fullscreenElement = null;
    fire(doc, "fullscreenchange");
    jest.advanceTimersByTime(12000);
    doc.fullscreenElement = { id: "exam" };
    fire(doc, "fullscreenchange");

    expect(breaches).toEqual([12]);
    expect(kinds(log)).toEqual(["FULLSCREEN_EXIT", "OUT_OF_FULLSCREEN_LIMIT"]);
  });

  it("still counts the seconds when the page never comes back", () => {
    const { doc, log, watcher } = proctenedSetup();
    doc.fullscreenElement = null;
    fire(doc, "fullscreenchange");
    jest.advanceTimersByTime(6000);

    watcher.stop();
    expect(log.entries()[0]).toMatchObject({ kind: "FULLSCREEN_EXIT", outOfFullscreenSeconds: 6 });
  });

  it("does not blame the candidate for measurements full screen itself changed", () => {
    const { doc, win, log } = proctenedSetup();
    doc.fullscreenElement = null;
    fire(doc, "fullscreenchange");
    Object.assign(win, { innerWidth: 1000 });
    fire(win, "resize");
    expect(kinds(log)).toEqual([]);

    jest.advanceTimersByTime(3000);
    Object.assign(win, { innerWidth: 1280 });
    fire(win, "resize");
    expect(kinds(log)).toEqual(["WINDOW_RESIZED"]);
  });
});

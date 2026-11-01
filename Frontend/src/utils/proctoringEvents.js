/**
 * What the exam page watches for, and what each sighting is worth.
 *
 * The server owns the verdict: it re-reads every kind named here, decides its own severity, weight,
 * label and timestamp, and ignores anything it does not know. This file exists so the candidate can
 * watch their own record build up while they work, rather than meeting it on the result page — which
 * is why the numbers below are a copy of the server's catalogue and are guarded by a test that reads
 * the Java enum they came from.
 */

export const POINTS = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/** Kinds a browser can observe, with the severity the server gives each one. */
export const OBSERVABLE = {
  TAB_HIDDEN: { severity: "HIGH", label: "Left the exam tab or window" },
  WINDOW_BLUR: { severity: "MEDIUM", label: "Exam window lost focus" },
  FULLSCREEN_EXIT: { severity: "HIGH", label: "Left full-screen mode" },
  FULLSCREEN_DENIED: { severity: "MEDIUM", label: "Full-screen mode could not be entered" },
  COPY: { severity: "MEDIUM", label: "Copied text out of the exam" },
  CUT: { severity: "MEDIUM", label: "Cut text from the exam" },
  PASTE: { severity: "HIGH", label: "Pasted text into the exam" },
  CONTEXT_MENU: { severity: "MEDIUM", label: "Opened the browser menu" },
  TEXT_SELECTION: { severity: "LOW", label: "Selected exam text" },
  DRAG: { severity: "LOW", label: "Dragged content out of the exam" },
  FORBIDDEN_KEY: { severity: "MEDIUM", label: "Pressed a blocked keyboard shortcut" },
  PRINT_SCREEN: { severity: "MEDIUM", label: "Pressed the screenshot key" },
  PRINT_OR_SAVE: { severity: "HIGH", label: "Tried to print or save the exam" },
  DEVTOOLS_KEY: { severity: "HIGH", label: "Tried to open developer tools" },
  BEFORE_UNLOAD: { severity: "HIGH", label: "Tried to close or reload the exam page" },
  NAVIGATION_BLOCKED: { severity: "HIGH", label: "Tried to navigate away mid-exam" },
  CAMERA_LOST: { severity: "HIGH", label: "Camera feed stopped during the attempt" },
  /** Recorded but never weighted, exactly as on the server: declining is a choice, not a fault. */
  CAMERA_DENIED: { severity: "LOW", label: "Camera was not permitted", counts: false },
  HEARTBEAT: { severity: "LOW", label: "Exam page is still in the foreground", counts: false },

  // Everything below is a second pair of eyes on the same room: the tricks that leave a trace in
  // the page rather than on the webcam. Severities are the server's, copied deliberately, and the
  // test that reads ProctorSignal.java fails if the two drift apart.
  FULLSCREEN_UNAVAILABLE: { severity: "MEDIUM", label: "Full screen is not available in this browser" },
  OUT_OF_FULLSCREEN_LIMIT: { severity: "HIGH", label: "Stayed out of full screen longer than allowed" },
  SYNTHETIC_EVENT: { severity: "HIGH", label: "A click or key press came from code, not a person" },
  AUTOMATION_DRIVER: { severity: "HIGH", label: "Automation software was found in this browser" },
  EMBEDDED_IN_IFRAME: { severity: "HIGH", label: "The exam page was opened inside another page" },
  SCREEN_SHARE_STARTED: { severity: "HIGH", label: "A screen share was started during the attempt" },
  PASTE_IMAGE: { severity: "HIGH", label: "Pasted a picture into the exam" },
  FILE_DROPPED: { severity: "HIGH", label: "Dropped a file onto the exam" },
  SELECT_ALL: { severity: "MEDIUM", label: "Selected every question at once" },
  CLIPBOARD_READ: { severity: "MEDIUM", label: "Read the exam's clipboard contents" },
  NETWORK_OFFLINE: { severity: "MEDIUM", label: "The connection to the exam dropped" },
  NETWORK_RESTORED: { severity: "LOW", label: "The connection to the exam came back", counts: false },
  WINDOW_RESIZED: { severity: "LOW", label: "The browser window was resized" },
  WINDOW_MOVED: { severity: "MEDIUM", label: "The browser window was moved" },
  VIEWPORT_TOO_SMALL: { severity: "MEDIUM", label: "The exam was shown in a window too small to be real" },
  OFF_SCREEN_WINDOW: { severity: "MEDIUM", label: "The exam window sat partly off the screen" },
  ZOOM_CHANGED: { severity: "LOW", label: "The browser zoom changed" },
  DEVTOOLS_LAYOUT_HINT: { severity: "MEDIUM", label: "The window measured as if developer tools were open" },
  SECOND_TAB_SAME_ATTEMPT: { severity: "HIGH", label: "The same attempt was open in two tabs" },
};

/** The same three steps the server's policy uses, so the banner and the verdict agree. */
export const REVIEW_POINTS = 3;
export const FLAG_POINTS = 6;
/** A ceiling of our own: past this the page stops watching and hands the paper in. */
export const STOP_POINTS = 18;

const NOT_COUNTING = Object.keys(OBSERVABLE).filter((k) => OBSERVABLE[k].counts === false);

export function severityOf(kind) {
  const signal = OBSERVABLE[kind];
  return signal ? signal.severity : null;
}

export function labelOf(kind) {
  const signal = OBSERVABLE[kind];
  return signal ? signal.label : kind;
}

export function pointsOf(kind) {
  const signal = OBSERVABLE[kind];
  if (!signal || signal.counts === false) {
    return 0;
  }
  return POINTS[signal.severity] || 0;
}

export function isKnown(kind) {
  return Object.prototype.hasOwnProperty.call(OBSERVABLE, kind);
}

/**
 * A running record of what this page saw.
 *
 * @param now milliseconds source, injectable so a test can move time
 * @param dedupeMs one kind seen twice inside this window counts once — a single alt-tab fires
 *        blur, visibilitychange and fullscreenexit together and must not read as three offences
 * @param maxEntries how much history the panel keeps
 */
export function createProctorLog({
  now = () => Date.now(),
  dedupeMs = 2000,
  maxEntries = 80,
  reviewPoints = REVIEW_POINTS,
  flagPoints = FLAG_POINTS,
  stopPoints = STOP_POINTS,
} = {}) {
  const entries = [];
  const unsent = [];
  const lastSeenAt = new Map();
  let totalPoints = 0;

  function observe(kind, detail = null, extra = null) {
    if (!isKnown(kind)) {
      return null;
    }
    const at = now();
    const previous = lastSeenAt.get(kind);
    lastSeenAt.set(kind, at);
    if (previous !== undefined && at - previous < dedupeMs) {
      return null;
    }
    const entry = {
      kind,
      label: labelOf(kind),
      severity: severityOf(kind),
      points: pointsOf(kind),
      at,
      detail,
      ...(extra || {}),
    };
    entries.push(entry);
    totalPoints += entry.points;
    if (entries.length > maxEntries) {
      // The panel shows recent history; the weight of everything observed keeps counting.
      entries.shift();
    }
    unsent.push({ kind, detail, clientReportedAt: localTimestamp(new Date(at)), ...(extra || {}) });
    return entry;
  }

  function points() {
    return totalPoints;
  }

  /**
   * clear → nothing worth mentioning; watch → the amber notice; flag → the record says a reviewer
   * should look; stop → the page takes the paper in rather than let the session run on.
   */
  function level() {
    const total = points();
    if (total >= stopPoints) return "stop";
    if (total >= flagPoints) return "flag";
    if (total >= reviewPoints) return "watch";
    return "clear";
  }

  return {
    observe,
    entries: () => entries.slice(),
    points,
    level,
    counts: () => {
      const byKind = {};
      for (const entry of entries) {
        byKind[entry.kind] = (byKind[entry.kind] || 0) + 1;
      }
      return byKind;
    },
    /** Everything observed since the last flush, in the shape the events endpoint wants. */
    drain: () => unsent.splice(0, unsent.length),
    pending: () => unsent.length,
  };
}

/**
 * Which integrity signal a key press represents, or null when it is an ordinary keystroke.
 *
 * Takes the fields of a KeyboardEvent rather than the event itself so this stays testable: blocked
 * shortcuts are reported, and the page also refuses to run them.
 */
export function keySignalFor(event) {
  if (!event || !event.key) {
    return null;
  }
  const key = String(event.key).toLowerCase();
  const ctrl = Boolean(event.ctrlKey || event.metaKey);
  const shift = Boolean(event.shiftKey);

  if (key === "printscreen") {
    return "PRINT_SCREEN";
  }
  if (key === "f12" || (ctrl && shift && ["i", "j", "c"].includes(key))) {
    return "DEVTOOLS_KEY";
  }
  if (ctrl && ["p", "s"].includes(key)) {
    return "PRINT_OR_SAVE";
  }
  if (ctrl && ["c", "x", "v"].includes(key)) {
    // copy/cut/paste are also caught as document events with the text involved; this is the
    // shortcut itself, which fires even when nothing is selected.
    return "FORBIDDEN_KEY";
  }
  if (ctrl && key === "u") {
    return "FORBIDDEN_KEY";
  }
  if (key === "tab" && ctrl) {
    return "FORBIDDEN_KEY";
  }
  return null;
}

const LOCAL_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?$/;

/** "2026-11-01T18:34:06.699" as an epoch, read as local time — the server writes local timestamps. */
export function parseLocalIso(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const match = LOCAL_ISO.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour = "0", minute = "0", second = "0", fraction = ""] = match;
  // Java pads the fraction to nanoseconds; only its first three digits are milliseconds.
  const millis = Number((fraction + "000").slice(0, 3));
  return new Date(Number(year), Number(month) - 1, Number(day),
    Number(hour), Number(minute), Number(second), millis).getTime();
}

/** How far the server's clock sits from this machine's, so the countdown is theirs, not ours. */
export function clockOffsetMs(serverNowIso, localAtRequest = Date.now()) {
  const server = parseLocalIso(serverNowIso);
  return server === null ? 0 : server - localAtRequest;
}

export function remainingSeconds(deadlineIso, offsetMs, nowMs = Date.now()) {
  const deadline = parseLocalIso(deadlineIso);
  if (deadline === null) {
    return null;
  }
  return Math.max(0, Math.round((deadline - (nowMs + offsetMs)) / 1000));
}

/** A wall-clock stamp the server can read as a LocalDateTime; kept as an assertion, never a fact. */
export function localTimestamp(date = new Date()) {
  const pad = (n, width = 2) => String(n).padStart(width, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${day}T${time}.${pad(date.getMilliseconds(), 3)}`;
}

export const NON_COUNTING_KINDS = NOT_COUNTING;

import { keySignalFor } from "./proctoringEvents";
import { createFullscreenTracker } from "./fullscreenGuard";

/**
 * Everything a browser is actually able to notice, wired to the log.
 *
 * This is detection, not prevention: a page cannot stop a screenshot, an extension or a phone
 * pointed at the screen, and pretending otherwise would be a lie printed under the timer. What it
 * can do is refuse the easy tricks — copy, paste, right-click, drag, print, the dev-tools
 * shortcuts — and write down every one of them, plus the things that leave a trace, as soon as
 * they happen.
 *
 * @param isSynthetic how the page tells an event that code dispatched from one a hand made. It is
 *        injectable because a test harness can only ever produce the first kind.
 */

/** Alt-tabbing also blurs the window; that is one departure, not two. */
const SUPPRESSED_BY = {
  TAB_HIDDEN: ["WINDOW_BLUR"],
};

const SUPPRESSION_MS = 5000;

/** Full screen changes the window's measurements; those seconds are ours, not the candidate's. */
const GEOMETRY_KINDS = ["WINDOW_RESIZED", "WINDOW_MOVED", "DEVTOOLS_LAYOUT_HINT", "ZOOM_CHANGED", "OFF_SCREEN_WINDOW", "VIEWPORT_TOO_SMALL"];
const GEOMETRY_SETTLE_MS = 2500;

/** Below this, on a machine with a mouse, the exam is not being read in a normal window. */
const MIN_VIEWPORT_WIDTH = 640;
const MIN_VIEWPORT_HEIGHT = 400;
/** A step change this large between two samples is a docked panel, not a resize the user meant. */
const DOCK_GROWTH_PX = 100;

export function createProctorWatcher({
  log,
  win = typeof window !== "undefined" ? window : undefined,
  doc = typeof document !== "undefined" ? document : undefined,
  now = () => Date.now(),
  heartbeatMs = 30000,
  flushMs = 15000,
  onFlush = () => {},
  fullscreen = {},
  tabId = null,
  isSynthetic = (event) => Boolean(event) && event.isTrusted === false,
} = {}) {
  if (!log || !doc || !win) {
    throw new Error("A proctor watcher needs a log, a document and a window.");
  }

  const fullscreenRequired = fullscreen.required !== false;
  const bound = [];
  const suppressed = new Map();
  let hiddenSince = null;
  let running = false;
  let timers = [];
  let geo = null;

  const tracker = createFullscreenTracker({
    budgetSeconds: fullscreen.budgetSeconds || 60,
    now,
    onStretch: (seconds) =>
      see("FULLSCREEN_EXIT", `Out of full screen for ${seconds}s.`, { outOfFullscreenSeconds: seconds }),
    onBreach: (seconds) => {
      see("OUT_OF_FULLSCREEN_LIMIT", `The paper was covered for ${seconds}s, which is the whole allowance.`);
      flush(true);
      if (fullscreen.onBreach) {
        fullscreen.onBreach(seconds);
      }
    },
    onChange: (state) => {
      if (fullscreen.onState) {
        fullscreen.onState(state);
      }
    },
  });

  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    bound.push([target, type, handler, options]);
  }

  function see(kind, detail, extra) {
    if (!running) {
      return null;
    }
    const swallowedAt = suppressed.get(kind);
    if (swallowedAt !== undefined && now() < swallowedAt) {
      return null;
    }
    const entry = log.observe(kind, detail, extra);
    if (entry && SUPPRESSED_BY[kind]) {
      suppress(SUPPRESSED_BY[kind], SUPPRESSION_MS);
    }
    return entry;
  }

  function suppress(kinds, ms) {
    const until = now() + ms;
    kinds.forEach((kind) => suppressed.set(kind, until));
  }

  function blockable(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
  }

  /** The measurements that give a second monitor, a docked panel or a shrunken window away. */
  function geometry() {
    return {
      innerWidth: numberOr(win.innerWidth, 0),
      innerHeight: numberOr(win.innerHeight, 0),
      gapX: numberOr(win.outerWidth, 0) - numberOr(win.innerWidth, 0),
      gapY: numberOr(win.outerHeight, 0) - numberOr(win.innerHeight, 0),
      screenX: numberOr(win.screenX, 0),
      screenY: numberOr(win.screenY, 0),
      dpr: numberOr(win.devicePixelRatio, 1),
    };
  }

  function checkGeometry() {
    const next = geometry();
    const previous = geo;
    geo = next;
    if (!previous || doc.fullscreenElement) {
      // While the page is fullscreen the browser reports the whole screen for both the window and
      // the viewport, so every gap reads as zero and nothing here means anything.
      return;
    }
    if (next.innerWidth !== previous.innerWidth || next.innerHeight !== previous.innerHeight) {
      see("WINDOW_RESIZED", `The viewport measured ${next.innerWidth}×${next.innerHeight}.`);
    }
    if (Math.abs(next.dpr - previous.dpr) > 0.01) {
      see("ZOOM_CHANGED", `Page zoom changed the device ratio to ${next.dpr}.`);
    }
    if (next.screenX !== previous.screenX || next.screenY !== previous.screenY) {
      see("WINDOW_MOVED", `The window moved to ${next.screenX},${next.screenY}.`);
    }
    if (next.screenX < -8 || next.screenY < -8) {
      see("OFF_SCREEN_WINDOW", `The window sat at ${next.screenX},${next.screenY}, partly off the display.`);
    }
    const grewX = next.gapX - previous.gapX;
    const grewY = next.gapY - previous.gapY;
    if (grewX > DOCK_GROWTH_PX || grewY > DOCK_GROWTH_PX) {
      see("DEVTOOLS_LAYOUT_HINT", `Space opened up beside the page: ${grewX}px across, ${grewY}px down.`);
    }
    if (next.innerWidth > 0 && next.innerHeight > 0 && !isTouch()
      && (next.innerWidth < MIN_VIEWPORT_WIDTH || next.innerHeight < MIN_VIEWPORT_HEIGHT)) {
      see("VIEWPORT_TOO_SMALL", `The exam was shown in ${next.innerWidth}×${next.innerHeight}.`);
    }
  }

  function isTouch() {
    if (!win.matchMedia) {
      return false;
    }
    try {
      return win.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  }

  function start() {
    if (running) {
      return;
    }
    running = true;

    on(doc, "visibilitychange", () => {
      if (doc.visibilityState === "hidden") {
        hiddenSince = now();
        see("TAB_HIDDEN");
        return;
      }
      const away = hiddenSince === null ? null : now() - hiddenSince;
      hiddenSince = null;
      geo = geometry();
      if (away !== null && away > 1000) {
        see("WINDOW_BLUR", `Out of view for ${Math.round(away / 1000)}s.`);
      }
    });

    on(win, "blur", () => see("WINDOW_BLUR"));

    on(doc, "fullscreenchange", () => {
      const inFullscreen = Boolean(doc.fullscreenElement);
      if (fullscreenRequired) {
        // One row per departure, carrying how long the paper was covered for.
        tracker.setFullscreen(inFullscreen);
      } else if (!inFullscreen) {
        see("FULLSCREEN_EXIT");
      }
      // Entering or leaving full screen rewrites every measurement the window reports.
      suppress(GEOMETRY_KINDS, GEOMETRY_SETTLE_MS);
      geo = geometry();
    });

    on(doc, "fullscreenerror", () => {
      see("FULLSCREEN_UNAVAILABLE", "This browser refused to put the exam in full screen.");
    });

    on(doc, "copy", (event) => {
      blockable(event);
      const text = clipText(event);
      see("COPY", text ? `${text.length} characters copied.` : null);
    });
    on(doc, "cut", (event) => {
      blockable(event);
      see("CUT", clipText(event) ? "Text was cut from the page." : null);
    });
    on(doc, "paste", (event) => {
      blockable(event);
      if (hasImage(event)) {
        see("PASTE_IMAGE", "A picture was pasted into the exam.");
        return;
      }
      const text = clipText(event);
      see("PASTE", text ? `${text.length} characters pasted.` : "Something was pasted into the exam.");
    });

    on(doc, "contextmenu", (event) => {
      blockable(event);
      see("CONTEXT_MENU");
    });

    on(doc, "dragstart", (event) => {
      blockable(event);
      see("DRAG");
    });

    // A file dragged in from outside the page is the one drag a candidate has no reason to make.
    on(doc, "dragover", (event) => blockable(event));
    on(doc, "drop", (event) => {
      blockable(event);
      const names = droppedNames(event);
      see("FILE_DROPPED", names ? `Dropped: ${names}.` : "Something was dropped onto the exam.");
    });

    on(doc, "selectstart", (event) => {
      blockable(event);
    });

    on(doc, "mouseup", () => {
      const selection = win.getSelection && win.getSelection();
      const text = selection ? String(selection) : "";
      if (text.trim().length > 0) {
        see("TEXT_SELECTION", `${text.trim().length} characters selected.`);
      }
    });

    on(doc, "keydown", (event) => {
      if (isSynthetic(event)) {
        see("SYNTHETIC_EVENT", `A ${event.key || "key"} press came from code.`);
      }
      if (event && (event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "a") {
        blockable(event);
        see("SELECT_ALL", "The whole page was selected.");
      }
      if (event && event.key === "PrintScreen") {
        // There is no screenshot API to call, but the key press itself is a fact worth recording.
        see("PRINT_SCREEN");
        return;
      }
      const kind = keySignalFor(event);
      if (!kind) {
        return;
      }
      blockable(event);
      see(kind, `Shortcut: ${describeKeys(event)}.`);
    }, true);

    on(doc, "click", (event) => {
      if (isSynthetic(event)) {
        see("SYNTHETIC_EVENT", "A click was dispatched by code, not by a hand.");
      }
    }, true);

    on(win, "beforeprint", () => see("PRINT_OR_SAVE"));

    on(win, "beforeunload", () => {
      see("BEFORE_UNLOAD");
      flush(true);
    });

    on(win, "resize", () => checkGeometry());

    on(win, "offline", () => see("NETWORK_OFFLINE", "The browser reported no connection."));
    on(win, "online", () => see("NETWORK_RESTORED", "The connection came back."));

    // Things a page can only ask about once, at the start of the sitting.
    if (win.top !== win.self) {
      see("EMBEDDED_IN_IFRAME", "The exam is running inside another page.");
    }
    const driver = automationMarker(win);
    if (driver) {
      see("AUTOMATION_DRIVER", `Found ${driver}.`);
    }
    wrapScreenShare();

    geo = geometry();
    if (fullscreenRequired) {
      tracker.arm(Boolean(doc.fullscreenElement));
      checkGeometry();
    }

    timers.push(
      win.setInterval(() => {
        see("HEARTBEAT");
        if (fullscreenRequired) {
          tracker.tick();
        }
        checkGeometry();
      }, heartbeatMs)
    );
    timers.push(win.setInterval(() => flush(false), flushMs));
  }

  /**
   * There is no "screen share started" event. Wrapping the API is the only way to know, and it is
   * the call a remote-proctoring or cheating app makes, so the wrapper is worth adding.
   */
  function wrapScreenShare() {
    const md = win.navigator && win.navigator.mediaDevices;
    if (!md || typeof md.getDisplayMedia !== "function" || md.getDisplayMedia.__proctored) {
      return;
    }
    const original = md.getDisplayMedia.bind(md);
    const wrapped = (...args) => {
      see("SCREEN_SHARE_STARTED", "The screen was offered to another application.");
      flush(true);
      return original(...args);
    };
    wrapped.__proctored = true;
    try {
      md.getDisplayMedia = wrapped;
    } catch {
      // A frozen property means the share cannot be witnessed here; nothing else should fail.
    }
  }

  /** Hands the queued signals to the caller; `keepalive` is the unload path, which must not block. */
  function flush(keepalive) {
    const batch = log.drain();
    if (batch.length) {
      onFlush(batch, keepalive);
    }
  }

  function stop() {
    // Closed out before the guard is dropped, so the last departure's seconds still reach the server.
    if (fullscreenRequired) {
      tracker.stop();
    }
    running = false;
    bound.forEach(([target, type, handler, options]) => target.removeEventListener(type, handler, options));
    bound.length = 0;
    timers.forEach((id) => win.clearInterval(id));
    timers = [];
    flush(false);
  }

  return {
    start,
    stop,
    flush: () => flush(false),
    isRunning: () => running,
    tabId: () => tabId,
    /** The full-screen state the page renders its cover from. */
    fullscreenState: () => (fullscreenRequired ? tracker.state() : { covered: false, coveredSeconds: 0, breach: false }),
    /**
     * Moves the cover's clock on, so a candidate watching the countdown sees it run and a sitting
     * that stays out of full screen closes on the second the budget is spent, not on the next beat.
     */
    tickFullscreen: () => (fullscreenRequired ? tracker.tick() : { covered: false, coveredSeconds: 0, breach: false }),
    /** Tries to put the paper back where it can only be read by the person in front of it. */
    restoreFullscreen: (element) => {
      if (!element || typeof element.requestFullscreen !== "function") {
        return Promise.reject(new Error("No full-screen request is possible here."));
      }
      return Promise.resolve(element.requestFullscreen());
    },
  };
}

function numberOr(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const AUTOMATION_MARKERS = [
  ["navigator.webdriver", (win) => win.navigator && win.navigator.webdriver === true],
  ["window.callPhantom", (win) => typeof win.callPhantom === "function"],
  ["window.__selenium_unwrapped", (win) => Boolean(win.__selenium_unwrapped)],
  ["window.__fxdriver_unwrapped", (win) => Boolean(win.__fxdriver_unwrapped)],
  ["window.__driver_evaluate", (win) => Boolean(win.__driver_evaluate)],
  ["window.domAutomation", (win) => Boolean(win.domAutomation || win.domAutomationController)],
  ["window._phantom", (win) => Boolean(win._phantom)],
];

function automationMarker(win) {
  for (const [name, present] of AUTOMATION_MARKERS) {
    try {
      if (present(win)) {
        return name;
      }
    } catch {
      // A probe that throws is a probe the page cannot answer, not a finding.
    }
  }
  return null;
}

function clipText(event) {
  if (!event || !event.clipboardData || typeof event.clipboardData.getData !== "function") {
    return "";
  }
  try {
    return event.clipboardData.getData("text") || "";
  } catch {
    return "";
  }
}

function hasImage(event) {
  return clipItems(event).some((item) => String(item.type || "").startsWith("image/"));
}

function clipItems(event) {
  if (!event || !event.clipboardData || !event.clipboardData.items) {
    return [];
  }
  return Array.from(event.clipboardData.items);
}

function droppedNames(event) {
  const files = event && event.dataTransfer && event.dataTransfer.files;
  if (!files || !files.length) {
    return clipItems(event)
      .map((item) => item.kind === "file" && typeof item.getAsFile === "function" ? (item.getAsFile() || {}).name : null)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
  }
  return Array.from(files)
    .slice(0, 3)
    .map((file) => file.name)
    .join(", ");
}

function describeKeys(event) {
  const mods = [];
  if (event.ctrlKey) mods.push("Ctrl");
  if (event.metaKey) mods.push("Cmd");
  if (event.shiftKey) mods.push("Shift");
  if (event.altKey) mods.push("Alt");
  return [...mods, event.key].join("+");
}

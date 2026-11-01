import { keySignalFor } from "./proctoringEvents";

/**
 * Everything a browser is actually able to notice, wired to the log.
 *
 * This is detection, not prevention: a page cannot stop a screenshot, an extension or a phone
 * pointed at the screen, and pretending otherwise would be a lie printed under the timer. What it
 * can do is refuse the easy tricks — copy, paste, right-click, drag, print, the dev-tools
 * shortcuts — and write down every one of them, plus the things that leave a trace, as soon as
 * they happen.
 */

/** Alt-tabbing also blurs the window; that is one departure, not two. */
const SUPPRESSED_BY = {
  TAB_HIDDEN: ["WINDOW_BLUR"],
};

const SUPPRESSION_MS = 5000;

export function createProctorWatcher({
  log,
  win = typeof window !== "undefined" ? window : undefined,
  doc = typeof document !== "undefined" ? document : undefined,
  now = () => Date.now(),
  heartbeatMs = 30000,
  flushMs = 15000,
  onFlush = () => {},
} = {}) {
  if (!log || !doc || !win) {
    throw new Error("A proctor watcher needs a log, a document and a window.");
  }

  const bound = [];
  const suppressed = new Map();
  let hiddenSince = null;
  let running = false;
  let timers = [];

  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    bound.push([target, type, handler, options]);
  }

  function see(kind, detail) {
    const swallowedAt = suppressed.get(kind);
    if (swallowedAt !== undefined && now() < swallowedAt) {
      return null;
    }
    const entry = log.observe(kind, detail);
    if (entry && SUPPRESSED_BY[kind]) {
      const until = now() + SUPPRESSION_MS;
      SUPPRESSED_BY[kind].forEach((blocked) => suppressed.set(blocked, until));
    }
    return entry;
  }

  function blockable(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
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
      if (away !== null && away > 1000) {
        see("WINDOW_BLUR", `Out of view for ${Math.round(away / 1000)}s.`);
      }
    });

    on(win, "blur", () => see("WINDOW_BLUR"));

    on(doc, "fullscreenchange", () => {
      if (!doc.fullscreenElement) {
        see("FULLSCREEN_EXIT");
      }
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
      const text = clipText(event);
      see("PASTE", text ? `${text.length} characters pasted.` : null);
    });

    on(doc, "contextmenu", (event) => {
      blockable(event);
      see("CONTEXT_MENU");
    });

    on(doc, "dragstart", (event) => {
      blockable(event);
      see("DRAG");
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

    on(win, "beforeprint", () => see("PRINT_OR_SAVE"));

    on(win, "beforeunload", () => {
      see("BEFORE_UNLOAD");
      flush(true);
    });

    timers.push(win.setInterval(() => see("HEARTBEAT"), heartbeatMs));
    timers.push(win.setInterval(() => flush(false), flushMs));
  }

  /** Hands the queued signals to the caller; `keepalive` is the unload path, which must not block. */
  function flush(keepalive) {
    const batch = log.drain();
    if (batch.length) {
      onFlush(batch, keepalive);
    }
  }

  function stop() {
    running = false;
    bound.forEach(([target, type, handler, options]) => target.removeEventListener(type, handler, options));
    bound.length = 0;
    timers.forEach((id) => win.clearInterval(id));
    timers = [];
    flush(false);
  }

  return { start, stop, flush: () => flush(false), isRunning: () => running };
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

function describeKeys(event) {
  const mods = [];
  if (event.ctrlKey) mods.push("Ctrl");
  if (event.metaKey) mods.push("Cmd");
  if (event.shiftKey) mods.push("Shift");
  if (event.altKey) mods.push("Alt");
  return [...mods, event.key].join("+");
}

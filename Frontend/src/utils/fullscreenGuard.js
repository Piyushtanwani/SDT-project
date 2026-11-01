/**
 * The part of invigilation that is not a claim: whether the paper is actually on screen.
 *
 * Full screen is what stops someone else reading over a candidate's shoulder and what stops the
 * exam sitting in a small window beside a phone. This module owns the accounting — how long the
 * sitting has spent covered — and nothing else: it never touches the DOM, so a test can move time
 * and flip the state without a browser. The watcher in proctorDom.js feeds it the truth.
 */

/** Whether this device can be put in full screen at all, before anything is promised to the learner. */
export function isFullscreenCapable(doc, element) {
  if (!doc || !element) {
    return false;
  }
  if (typeof doc.fullscreenEnabled === "boolean") {
    return doc.fullscreenEnabled;
  }
  // Older and mobile engines expose no flag at all; the method's absence is the answer.
  return typeof element.requestFullscreen === "function";
}

/** Asks for full screen from inside a click handler, which is the only moment a browser honours it. */
export function enterFullscreen(element) {
  if (!element || typeof element.requestFullscreen !== "function") {
    return Promise.reject(new Error("This browser has no full-screen request to make."));
  }
  return Promise.resolve(element.requestFullscreen());
}

export function leaveFullscreen(doc) {
  if (!doc || typeof doc.exitFullscreen !== "function" || !doc.fullscreenElement) {
    return Promise.resolve();
  }
  return Promise.resolve(doc.exitFullscreen()).catch(() => {});
}

/**
 * Counts the seconds a sitting spends outside full screen and says when the sitting is over.
 *
 * @param budgetSeconds total covered time one sitting is allowed before it stops being believable
 * @param now millisecond source, injectable so a test can move time
 * @param onStretch called with each departure's seconds once it closes, so the page reports one
 *        honest row per departure rather than one per keystroke
 * @param onBreach called once, the moment the budget is spent
 * @param onChange called with the live state whenever it moves, for the overlay and its countdown
 */
export function createFullscreenTracker({
  budgetSeconds = 60,
  now = () => Date.now(),
  onStretch = () => {},
  onBreach = () => {},
  onChange = () => {},
} = {}) {
  let armed = false;
  let inFullscreen = false;
  let coveredSince = null;
  let bankedSeconds = 0;
  let breached = false;

  function coveredSeconds() {
    const open = coveredSince === null ? 0 : Math.max(0, Math.round((now() - coveredSince) / 1000));
    return bankedSeconds + open;
  }

  function isCovered() {
    return armed && !inFullscreen;
  }

  function state() {
    return { covered: isCovered(), coveredSeconds: coveredSeconds(), bankedSeconds, budgetSeconds, breach: breached };
  }

  function announce() {
    onChange(state());
  }

  /** Ends the open departure, banks its seconds and weighs them against the budget. */
  function closeStretch() {
    if (coveredSince === null) {
      return;
    }
    const seconds = Math.max(0, Math.round((now() - coveredSince) / 1000));
    coveredSince = null;
    bankedSeconds += seconds;
    if (seconds > 0) {
      onStretch(seconds);
    }
    if (!breached && bankedSeconds >= budgetSeconds) {
      breached = true;
      onBreach(bankedSeconds);
    }
  }

  return {
    /**
     * Starts watching. A sitting that begins covered — a reload, which always drops full screen —
     * is covered from this instant, not from the instant the candidate next presses a button.
     */
    arm(fullscreenAtStart) {
      if (armed) {
        return state();
      }
      armed = true;
      inFullscreen = Boolean(fullscreenAtStart);
      if (!inFullscreen) {
        coveredSince = now();
      }
      announce();
      return state();
    },

    /** The document's fullscreenchange, or the answer to a request that never landed. */
    setFullscreen(fullscreen) {
      const next = Boolean(fullscreen);
      const changed = next !== inFullscreen;
      inFullscreen = next;
      if (next) {
        closeStretch();
      } else if (armed && changed && coveredSince === null) {
        // Only a real departure opens a stretch; a tick that spent the budget closes one without
        // the page ever coming back, and must not start the count again on the same seconds.
        coveredSince = now();
      }
      if (changed || coveredSince !== null) {
        announce();
      }
      return state();
    },

    /**
     * Keeps the clock honest with no DOM event to prompt it: a departure that simply runs past the
     * budget is still a breach, and the overlay's countdown still moves.
     */
    tick() {
      const wasCovered = coveredSince !== null;
      if (wasCovered) {
        if (!breached && coveredSeconds() >= budgetSeconds) {
          closeStretch();
        }
        announce();
      }
      return state();
    },

    /** Closes the open stretch so its seconds are still reported, then stops watching. */
    stop() {
      closeStretch();
      armed = false;
      const closed = { bankedSeconds, breach: breached };
      coveredSince = null;
      return closed;
    },

    isCovered,
    coveredSeconds,
    isBreach: () => breached,
    state,
  };
}

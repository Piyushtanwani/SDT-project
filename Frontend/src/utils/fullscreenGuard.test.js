import {
  createFullscreenTracker,
  enterFullscreen,
  isFullscreenCapable,
  leaveFullscreen,
} from "./fullscreenGuard";

/**
 * The cover is the one rule this exam can actually enforce, so the arithmetic behind it is tested
 * on its own: no DOM, no browser, only time moved forward and full screen said to be on or off.
 */

describe("whether this device can be watched at all", () => {
  it("asks the browser first, because a mobile engine says no without saying it", () => {
    expect(isFullscreenCapable({ fullscreenEnabled: true }, {})).toBe(true);
    expect(isFullscreenCapable({ fullscreenEnabled: false }, { requestFullscreen: () => {} })).toBe(false);
    expect(isFullscreenCapable(null, {})).toBe(false);
    expect(isFullscreenCapable({}, null)).toBe(false);
  });

  it("falls back to the method when the flag does not exist", () => {
    expect(isFullscreenCapable({}, { requestFullscreen: () => {} })).toBe(true);
    expect(isFullscreenCapable({}, {})).toBe(false);
  });

  it("refuses to ask a browser that cannot answer", async () => {
    await expect(enterFullscreen(null)).rejects.toThrow(/full-screen/);
    await expect(enterFullscreen({})).rejects.toThrow(/full-screen/);
    let asked = 0;
    await enterFullscreen({ requestFullscreen: () => { asked += 1; return Promise.resolve(); } });
    expect(asked).toBe(1);
  });

  it("leaves full screen only when it is in it, and survives a browser that throws", async () => {
    await leaveFullscreen({ fullscreenElement: null, exitFullscreen: () => { throw new Error("no"); } });
    await leaveFullscreen({ fullscreenElement: {}, exitFullscreen: () => Promise.reject(new Error("denied")) });
    expect.assertions(0);
  });
});

describe("the seconds a sitting spends covered", () => {
  let clock = 0;
  const now = () => clock;

  beforeEach(() => {
    clock = 0;
  });

  function trackerOf(budgetSeconds = 60) {
    const stretches = [];
    const breaches = [];
    const states = [];
    const tracker = createFullscreenTracker({
      budgetSeconds,
      now,
      onStretch: (seconds) => stretches.push(seconds),
      onBreach: (seconds) => breaches.push(seconds),
      onChange: (state) => states.push(state),
    });
    return { tracker, stretches, breaches, states };
  }

  it("is not watching until the sitting is armed", () => {
    const { tracker, stretches } = trackerOf();
    tracker.setFullscreen(false);
    clock = 10_000;
    tracker.tick();
    expect(tracker.isCovered()).toBe(false);
    expect(stretches).toEqual([]);
  });

  it("starts covered when the sitting opens outside full screen", () => {
    const { tracker, states } = trackerOf();
    tracker.arm(false);
    expect(tracker.isCovered()).toBe(true);
    expect(states[0]).toMatchObject({ covered: true, breach: false });
  });

  it("banks one departure's whole length when full screen comes back", () => {
    const { tracker, stretches } = trackerOf();
    tracker.arm(true);
    tracker.setFullscreen(false);
    clock = 42_000;
    tracker.setFullscreen(true);

    expect(stretches).toEqual([42]);
    expect(tracker.coveredSeconds()).toBe(42);
    expect(tracker.isCovered()).toBe(false);
  });

  it("adds up several departures and calls the breach once the budget is spent", () => {
    const { tracker, breaches, stretches } = trackerOf(60);
    tracker.arm(true);

    tracker.setFullscreen(false);
    clock = 25_000;
    tracker.setFullscreen(true);

    clock = 30_000;
    tracker.setFullscreen(false);
    clock = 70_000;
    tracker.setFullscreen(true);

    expect(stretches).toEqual([25, 40]);
    expect(breaches).toEqual([65]);
    expect(tracker.isBreach()).toBe(true);
  });

  it("trips on its own clock when nothing comes back to re-enter", () => {
    const { tracker, breaches } = trackerOf(10);
    tracker.arm(true);
    tracker.setFullscreen(false);

    clock = 11_000;
    expect(tracker.tick().breach).toBe(true);
    expect(breaches).toEqual([11]);
    expect(tracker.tick().breach).toBe(true);
    expect(breaches).toHaveLength(1);
  });

  it("still reports the open stretch when the sitting stops", () => {
    const { tracker, stretches } = trackerOf();
    tracker.arm(true);
    tracker.setFullscreen(false);
    clock = 6000;

    expect(tracker.stop()).toEqual({ bankedSeconds: 6, breach: false });
    expect(stretches).toEqual([6]);
    expect(tracker.isCovered()).toBe(false);
  });

  it("rounds a half second of flicker away rather than accusing the candidate of a minute", () => {
    const { tracker, stretches } = trackerOf();
    tracker.arm(true);
    tracker.setFullscreen(false);
    clock = 400;
    tracker.setFullscreen(true);
    expect(stretches).toEqual([]);
    expect(tracker.coveredSeconds()).toBe(0);
  });
});

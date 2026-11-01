import { formatClock, formatDuration, formatServerTime, readable, shortAgent } from "./reportFormat";

describe("reading the server's clock", () => {
  it("keeps a zone-less stamp on the wall clock it was written with", () => {
    // `new Date(...)` would move this into whichever machine is reading it, so an invigilator and
    // a candidate could end up quoting different times for one event.
    expect(formatServerTime("2026-11-01T18:34:06.699")).toBe("01 Nov 2026, 18:34");
    expect(formatClock("2026-11-01T08:05:03.007")).toBe("08:05:03");
  });

  it("survives a missing or unreadable stamp without inventing a time", () => {
    expect(formatServerTime(null)).toBe("—");
    expect(formatClock(undefined)).toBe("—");
    expect(formatServerTime("not a time")).toBe("not a time");
  });
});

describe("saying how long something took", () => {
  it("spells a length the way a person would", () => {
    expect(formatDuration(42)).toBe("42s");
    expect(formatDuration(754)).toBe("12m 34s");
    expect(formatDuration(3725)).toBe("1h 02m");
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(-5)).toBe("0s");
  });
});

describe("naming a machine without outing it", () => {
  it("reads the browser and the platform family out of a user agent", () => {
    expect(
      shortAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    ).toBe("Chrome 120.0.0.0 · Macintosh");
    expect(shortAgent("Edg/121.0.2277.83 (Windows NT 10.0)")).toBe("Edge 121.0.2277.83 · Windows NT 10.0");
    expect(shortAgent(null)).toBe("unknown");
  });

  it("turns a server constant into something a learner can read", () => {
    expect(readable("NEVER_TURNED_ON")).toBe("never turned on");
    expect(readable(null)).toBe("unknown");
  });
});

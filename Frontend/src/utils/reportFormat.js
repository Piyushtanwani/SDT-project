/**
 * The server stamps its reports with a zone-less `LocalDateTime`, which is the wall clock it was
 * written on. Reading one through `new Date()` and re-formatting it would quietly re-project the
 * instant into whichever machine is looking, so the string is read exactly as written and labelled
 * as server time. Every page and the printed copy then agree on the same number.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const parts = (value) => {
  const [day, time = ""] = String(value).split("T");
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d, h: Number(time.slice(0, 2)) || 0, min: Number(time.slice(3, 5)) || 0, s: Number(time.slice(6, 8)) || 0 };
};

/** `01 Nov 2026, 18:34` — the form an invigilator quotes in a decision note. */
export const formatServerTime = (value) => {
  if (!value) return "—";
  const p = parts(value);
  if (!p) return String(value);
  return `${String(p.d).padStart(2, "0")} ${MONTHS[p.m - 1]} ${p.y}, ${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;
};

/** `18:34:06` — the second matters when a candidate reads a timeline of a short sitting. */
export const formatClock = (value) => {
  if (!value) return "—";
  const p = parts(value);
  if (!p) return String(value);
  return `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}:${String(p.s).padStart(2, "0")}`;
};

/** A length of work, spelled the way a person would say it out loud. */
export const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return "—";
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
};

/** Server enum values arrive in caps; a learner reads sentences, not constants. */
export const readable = (value) => (value ? String(value).toLowerCase().replace(/_/g, " ") : "unknown");

/**
 * A user agent is a fingerprint of the machine rather than a finding, so a report names the browser
 * and the platform family instead of pasting the whole string at a candidate.
 */
export const shortAgent = (userAgent) => {
  if (!userAgent) return "unknown";
  const browser = /(?:(Chrome|Firefox|Safari|Edg|Opera|OPR)\/([\d.]+))/.exec(userAgent);
  const os = /\(([^)]+)\)/.exec(userAgent);
  return [
    browser ? `${browser[1].replace("Edg", "Edge").replace("OPR", "Opera")} ${browser[2]}` : null,
    os ? os[1].split(";")[0].trim() : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

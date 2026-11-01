import React from "react";

/**
 * The candidate's own record, shown while it is being written.
 *
 * Nothing here is a threat: the point of letting the learner watch their own signals pile up is
 * that the result page cannot surprise them with a verdict they never saw coming, and that a
 * mistake — a stray alt-tab — reads as one line rather than as a hidden mark against them.
 */

const COPY = {
  clear: {
    title: "All quiet",
    body: "Nothing has left the exam screen.",
    tone: "text-gray-600 dark:text-gray-400",
  },
  watch: {
    title: "Being watched",
    body: "What you did is on your record and your instructor can see it.",
    tone: "text-amber-700 dark:text-amber-300",
  },
  flag: {
    title: "Marked for review",
    body: "This attempt now carries a flag. A reviewer decides what it means.",
    tone: "text-orange-700 dark:text-orange-300",
  },
  stop: {
    title: "Handing in",
    body: "Too much left the screen. We are submitting what you have answered.",
    tone: "text-red-700 dark:text-red-300",
  },
};

export function ProctorBanner({ level }) {
  if (level === "clear") {
    return null;
  }
  const copy = COPY[level];
  return (
    <div className={`px-4 py-2 text-xs font-medium border-t border-gray-200 dark:border-gray-700 ${copy.tone}`}>
      <div className="max-w-5xl mx-auto">
        <span className="font-semibold">{copy.title}:</span> {copy.body}
      </div>
    </div>
  );
}

export function ExamProctorPanel({ entries, points, level }) {
  const copy = COPY[level] || COPY.clear;
  const recent = entries.slice(-12);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Your record so far</h3>
      <p className={`text-xs mt-1 ${copy.tone}`}>{copy.body}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {entries.length} signal{entries.length === 1 ? "" : "s"} · weight {points}
      </p>

      {recent.length === 0 ? (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Nothing has been seen yet. Leaving full screen, switching tabs, copying, pasting, right-clicking
          or pressing the screenshot key will appear here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {recent
            .slice()
            .reverse()
            .map((entry, position) => (
              <li key={`${entry.kind}-${entry.at}-${position}`} className="text-xs">
                <span
                  className={
                    entry.points === 0
                      ? "text-gray-500 dark:text-gray-400"
                      : entry.points >= 3
                        ? "text-orange-700 dark:text-orange-300"
                        : "text-amber-700 dark:text-amber-300"
                  }
                >
                  {entry.label}
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  {" "}
                  · {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  {entry.points > 0 ? ` · +${entry.points}` : ""}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

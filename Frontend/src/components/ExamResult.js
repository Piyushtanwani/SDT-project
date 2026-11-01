import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL, getAuthHeaders } from "../config/api";

/**
 * The result, and the record that produced it.
 *
 * The score comes from the server's grading of the sheet the server holds; the timeline is the
 * same list a reviewer reads, with the same labels and the same timestamps, so there is nothing
 * the candidate learns later that they could not see here on the day.
 */

const VERDICTS = {
  CLEAN: {
    title: "No integrity flags",
    body: "Nothing on this attempt was weighted enough to need a second look.",
    tone: "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  },
  REVIEW: {
    title: "Sent for a second look",
    body: "What was recorded added up to a review. An instructor decides what it means.",
    tone: "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300",
  },
  FLAGGED: {
    title: "Flagged for review",
    body: "Several signals landed on this attempt. An instructor is meant to read the record below.",
    tone: "bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
  },
};

function minutes(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
}

function timeOf(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const ExamResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const apiUrl = API_BASE_URL;

  useEffect(() => {
    let cancelled = false;
    const headers = { ...getAuthHeaders() };

    fetch(`${apiUrl}/api/exams/result/${attemptId}`, { headers })
      .then((res) => {
        if (res.status === 403) throw new Error("This result belongs to another account.");
        if (res.status === 404) throw new Error("This result could not be found.");
        if (!res.ok) throw new Error("We could not load this result. Please try again.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (typeof data?.score !== "number") {
          setError("This result is unavailable.");
          return;
        }
        setResult(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    fetch(`${apiUrl}/api/exams/${attemptId}/timeline`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setEvents(list);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [attemptId, apiUrl]);

  if (error) {
    return (
      <div className="w-full min-h-screen flex justify-center items-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Result unavailable</h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <button
            type="button"
            className="mt-6 min-h-[44px] bg-indigo-600 text-white px-6 rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={() => navigate("/attempts")}
          >
            Go to My Exam History
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const voided = result.status === "VOIDED";
  const verdict = VERDICTS[result.integrity] || null;

  return (
    <div className="min-h-screen flex justify-center p-4 py-8">
      <div className="w-full max-w-2xl space-y-4">
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Attempt {result.attemptNumber ?? "—"}
            {result.totalQuestions ? ` · ${result.correctCount ?? 0} of ${result.totalQuestions} correct` : ""}
            {result.durationSeconds !== null ? ` · ${minutes(result.durationSeconds)} of work` : ""}
          </p>
          <h1
            className={`mt-2 text-3xl font-semibold ${
              voided
                ? "text-red-600 dark:text-red-400"
                : result.passed
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {voided
              ? "This result was voided"
              : result.passed
                ? "You passed"
                : `Score: ${result.score}%`}
          </h1>
          {!voided && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {result.passed
                ? "You met the 80% pass mark. Your certificate is in My Exam History."
                : "You need at least 80% to earn a certificate on this course."}
            </p>
          )}
          {result.autoGraded && (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
              Time ran out, so this was graded from the answers our server had already saved.
            </p>
          )}
        </section>

        {(verdict || voided || result.reviewNote) && (
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Integrity verdict
            </h2>
            {voided ? (
              <p className="text-sm text-red-700 dark:text-red-300">
                A reviewer voided this result on{" "}
                {result.reviewedAt ? new Date(result.reviewedAt).toLocaleDateString() : "a later date"}. The
                score above stays on the record, but it no longer carries a credential and the sitting
                is still spent.
              </p>
            ) : (
              verdict && (
                <div className={`rounded-lg p-4 text-sm ${verdict.tone}`}>
                  <p className="font-semibold">{verdict.title}</p>
                  <p className="mt-1">{verdict.body}</p>
                  <p className="mt-2 text-xs">
                    {result.violationCount} recorded signal{result.violationCount === 1 ? "" : "s"} · weight{" "}
                    {result.violationPoints}
                  </p>
                </div>
              )
            )}
            {result.reviewNote && (
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">
                  {result.reviewedAt ? `Decision on ${new Date(result.reviewedAt).toLocaleString()}:` : "Decision:"}
                </span>{" "}
                {result.reviewNote}
              </p>
            )}
          </section>
        )}

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            What was recorded
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Every line was timed by our server when it arrived, not by the browser. This is the same
            list your instructor reads.
          </p>

          {events.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nothing was recorded during this attempt.
            </p>
          ) : (
            <ol className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-3 text-sm">
                  <span
                    className={`mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                      event.severity === "HIGH"
                        ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                        : event.severity === "MEDIUM"
                          ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {event.points > 0 ? `Weight ${event.points}` : "No weight"}
                  </span>
                  <div>
                    <p className="text-gray-800 dark:text-gray-200">{event.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {timeOf(event.serverReceivedAt)}
                      {event.elapsedSeconds !== null && event.elapsedSeconds !== undefined
                        ? ` · ${Math.floor(event.elapsedSeconds / 60)}m into the exam`
                        : ""}
                      {event.detail ? ` · ${event.detail}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="min-h-[44px] bg-indigo-600 text-white px-6 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            onClick={() => navigate("/attempts")}
          >
            My Exam History
          </button>
          {result.passed && !voided && (
            <button
              type="button"
              className="min-h-[44px] px-6 rounded-lg font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-gray-700 border border-indigo-200 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors"
              onClick={() => navigate("/certificates")}
            >
              View Certificates
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

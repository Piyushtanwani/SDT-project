import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuthHeaders, API_BASE_URL } from "../config/api";
import { clockOffsetMs, createProctorLog, remainingSeconds } from "../utils/proctoringEvents";
import { createProctorWatcher } from "../utils/proctorDom";
import { enterFullscreen, isFullscreenCapable } from "../utils/fullscreenGuard";
import { ExamProctorPanel, ProctorBanner } from "./ExamProctorPanel";

/** How often the page checks in with the server while the clock runs. */
const AUTOSAVE_MS = 15000;
const SNAPSHOT_MS = 60000;
const PANEL_REFRESH_MS = 700;

/**
 * One id per browser tab, kept across a reload so the server can tell "the same tab came back"
 * from "the same sitting is open in two places at once".
 */
function readTabId() {
  const KEY = "sdt.exam.tab";
  try {
    const existing = window.sessionStorage.getItem(KEY);
    if (existing) {
      return existing;
    }
    const fresh = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}

export const TakeExam = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const apiUrl = API_BASE_URL;

  const [rules, setRules] = useState(null);
  const [sitting, setSitting] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [phase, setPhase] = useState("rules");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [staleConnection, setStaleConnection] = useState(false);
  const [proctor, setProctor] = useState({ entries: [], points: 0, level: "clear" });
  const [ending, setEnding] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraMessage, setCameraMessage] = useState(null);
  const [cover, setCover] = useState({ covered: false, coveredSeconds: 0, budgetSeconds: 0 });

  const log = useRef(createProctorLog()).current;
  const watcher = useRef(null);
  const tabId = useRef(readTabId()).current;
  const video = useRef(null);
  const stream = useRef(null);
  const sheet = useRef(answers);
  const attempt = useRef(null);
  const endingRef = useRef(null);
  const handedIn = useRef(false);
  const lastAutoTry = useRef(0);
  const warned = useRef(false);
  const saveTimer = useRef(null);
  const paper = useRef(null);

  // The cover says the questions "cannot be read or answered". An overlay alone does not make
  // that true — the options stay tabbable behind it — so the paper itself is switched off while
  // it is covered, the same condition that paints the cover.
  useEffect(() => {
    if (paper.current) paper.current.inert = Boolean(cover.covered && !ending);
  }, [cover.covered, ending]);

  sheet.current = answers;
  attempt.current = sitting;
  const attemptId = sitting ? sitting.attemptId : null;

  /**
   * One POST against the attempt, with the failure made visible rather than fatal: the row on the
   * server keeps the clock and the last saved sheet, so a dropped request costs a second, not the exam.
   */
  async function send(path, body, keepalive = false) {
    const response = await fetch(`${apiUrl}/api/exams/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
      keepalive,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      const failure = new Error(detail?.message || `Server responded with ${response.status}`);
      failure.status = response.status;
      throw failure;
    }
    return response.json();
  }

  function reportProctor() {
    setProctor({ entries: log.entries(), points: log.points(), level: log.level() });
  }

  async function saveSheet() {
    if (!attempt.current) return;
    try {
      await send(`${attempt.current.attemptId}/autosave`, { answers: sheet.current });
      setSavedAt(new Date());
      setStaleConnection(false);
    } catch {
      setStaleConnection(true);
    }
  }

  useEffect(() => {
    if (!attemptId) return undefined;
    const required = sitting.fullscreenRequired !== false;
    watcher.current = createProctorWatcher({
      log,
      tabId,
      fullscreen: {
        required,
        budgetSeconds: sitting.maxFullscreenBlockSeconds || 60,
        onState: (state) =>
          setCover({
            covered: state.covered,
            coveredSeconds: state.coveredSeconds,
            budgetSeconds: state.budgetSeconds,
          }),
        onBreach: () => closeSitting("Full screen was lost for longer than one sitting allows."),
      },
      onFlush: (batch, keepalive) => {
        send(`${attemptId}/events`, { events: batch, browserTabId: tabId }, keepalive)
          .then((response) => {
            if (response && response.attemptClosed) {
              closeSitting(response.message || "This sitting is closed.");
            }
          })
          .catch(() => {
            setStaleConnection(true);
          });
      },
    });
    watcher.current.start();
    return () => {
      if (watcher.current) {
        watcher.current.stop();
        watcher.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  /** The server, the clock or the cover decides this; the candidate's own Submit is never gated. */
  function closeSitting(reason) {
    if (endingRef.current) {
      return;
    }
    endingRef.current = reason;
    setEnding(reason);
    setNotice(null);
    handIn(true);
  }

  useEffect(() => {
    if (!attemptId) return undefined;
    const tick = setInterval(() => {
      const current = attempt.current;
      if (!current) return;
      const left = remainingSeconds(current.deadline, current.offset, Date.now());
      setTimeLeft(left);
      if (watcher.current) {
        watcher.current.tickFullscreen();
      }
      if (left === 0) {
        handIn(true);
        return;
      }
      if (endingRef.current) {
        handIn(true);
      }
    }, 1000);
    const save = setInterval(saveSheet, AUTOSAVE_MS);
    const panel = setInterval(reportProctor, PANEL_REFRESH_MS);
    return () => {
      clearInterval(tick);
      clearInterval(save);
      clearInterval(panel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  useEffect(() => {
    if (phase !== "exam" || warned.current) return;
    const first = proctor.entries.find((entry) => entry.points > 0);
    if (first) {
      warned.current = true;
      setNotice(first);
    }
  }, [phase, proctor.entries]);

  useEffect(() => {
    if (phase !== "exam") return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  useEffect(
    () => () => {
      document.body.style.overflow = "auto";
      if (stream.current) {
        stream.current.getTracks().forEach((track) => track.stop());
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${apiUrl}/api/exams/course/${courseId}/rules`, { headers: { ...getAuthHeaders() } })
      .then((response) => {
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setRules(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, courseId]);

  async function startExam() {
    setLoading(true);
    setError(null);
    const wantsFullscreen = !rules || rules.fullscreenRequired !== false;
    if (wantsFullscreen && !isFullscreenCapable(document, document.documentElement)) {
      // Better to say so before the clock starts than to run an exam the invigilator cannot read.
      log.observe("FULLSCREEN_UNAVAILABLE", "This browser cannot put the exam in full screen.");
      setError(
        "This exam is taken in full screen, and this browser cannot offer it. Phone and tablet "
          + "browsers, and windows opened inside another app, do not support it — please use Chrome, "
          + "Edge or Firefox on a computer."
      );
      setLoading(false);
      return;
    }
    try {
      if (wantsFullscreen) {
        try {
          await enterFullscreen(document.documentElement);
        } catch {
          log.observe("FULLSCREEN_DENIED", "The browser refused full screen for this page.");
        }
      }
      const response = await fetch(`${apiUrl}/api/exams/course/${courseId}/start`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
      });
      const detail = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(detail?.message || `Server responded with ${response.status}`);
      }
      setSitting({
        attemptId: detail.attemptId,
        drawToken: detail.drawToken,
        questions: detail.questions || [],
        deadline: detail.deadline,
        offset: clockOffsetMs(detail.serverNow),
        durationSeconds: detail.durationSeconds,
        minDurationSeconds: detail.minDurationSeconds || 0,
        maxFullscreenBlockSeconds: detail.maxFullscreenBlockSeconds || 60,
        fullscreenRequired: detail.fullscreenRequired !== false,
        attemptNumber: detail.attemptNumber,
      });
      setCover({ covered: false, coveredSeconds: 0, budgetSeconds: detail.maxFullscreenBlockSeconds || 60 });
      setTimeLeft(remainingSeconds(detail.deadline, clockOffsetMs(detail.serverNow)));
      setPhase("exam");
      document.body.style.overflow = "hidden";
      reportProctor();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handIn(auto) {
    if (handedIn.current || submitting) return;
    // The clock and the proctor both retry an automatic hand-in, so a rejected paper is retried
    // on a ten-second cadence rather than once per tick for the rest of the sitting.
    if (auto && Date.now() - lastAutoTry.current < 10000) return;
    lastAutoTry.current = Date.now();
    const current = attempt.current;
    if (!current) return;
    handedIn.current = true;
    setSubmitting(true);
    if (watcher.current) {
      watcher.current.stop();
    }
    try {
      await send(`${current.attemptId}/autosave`, { answers: sheet.current }).catch(() => {});
      const response = await fetch(`${apiUrl}/api/exams/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          attemptId: current.attemptId,
          drawToken: current.drawToken,
          answers: sheet.current,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || `Server responded with ${response.status}`);
      }
      stopCamera();
      document.body.style.overflow = "auto";
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }
      navigate(`/result/${data.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
      handedIn.current = false;
      if (auto) {
        // A timed-out attempt is closed by the server's sweep; leaving the page open on a failed
        // auto-submit would only hide the result, so the candidate is told to hand it in again.
        setNotice(null);
      }
    }
  }

  function chooseAnswer(questionId, option) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveSheet, 2500);
  }

  function stopCamera() {
    if (stream.current) {
      stream.current.getTracks().forEach((track) => track.stop());
      stream.current = null;
    }
    setCameraOn(false);
  }

  async function captureFrame(label) {
    const node = video.current;
    if (!node || !node.videoWidth || !attempt.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(node, 0, 0, canvas.width, canvas.height);
    try {
      await send(`${attempt.current.attemptId}/snapshot`, {
        label,
        imageDataUrl: canvas.toDataURL("image/jpeg", 0.5),
      });
    } catch {
      setStaleConnection(true);
    }
  }

  async function enableCamera() {
    setCameraMessage(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: false,
      });
      stream.current = media;
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play().catch(() => {});
      }
      setCameraOn(true);
      captureFrame("START");
    } catch (err) {
      log.observe("CAMERA_DENIED", err && err.name ? err.name : "not permitted");
      reportProctor();
      setCameraMessage(
        "Your browser did not allow the camera. Nothing is captured, and that is recorded as a choice, not a fault."
      );
    }
  }

  useEffect(() => {
    if (!cameraOn || !attemptId) return undefined;
    const shot = setInterval(() => captureFrame("PERIODIC"), SNAPSHOT_MS);
    return () => {
      clearInterval(shot);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, attemptId]);

  const questions = sitting ? sitting.questions : [];
  const current = questions[index] || null;
  const answered = Object.keys(answers).length;
  const elapsed = timeLeft === null ? 0 : (sitting.durationSeconds || 0) - timeLeft;
  const canHandIn = !sitting || elapsed >= (sitting.minDurationSeconds || 0);

  const clock = useMemo(() => {
    if (timeLeft === null) return "--:--";
    return `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;
  }, [timeLeft]);

  if (phase === "rules") {
    const exhausted = rules ? rules.attemptsRemaining <= 0 : false;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Your assessment
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            Read these before you start. The clock, the questions and your answers are kept on our
            server, so nothing here depends on your machine being honest.
          </p>

          {loading && !rules && <p className="text-gray-500 dark:text-gray-400 text-sm">Loading the rules…</p>}

          {rules && (
            <ul className="space-y-3 mb-6">
              {rules.disclosures.map((line) => (
                <li key={line} className="flex items-start text-gray-800 dark:text-gray-300 text-sm">
                  <span className="mr-3 mt-1 text-indigo-600 dark:text-indigo-400" aria-hidden="true">
                    •
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}

          {rules && exhausted && (
            <div className="mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 p-4 text-sm">
              {rules.nextAllowedAt
                ? `You have used every attempt. The next one opens after ${new Date(
                    rules.nextAllowedAt
                  ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} on ${new Date(
                    rules.nextAllowedAt
                  ).toLocaleDateString()}.`
                : "You have used every attempt for this exam."}
            </div>
          )}

          {rules && !exhausted && rules.attemptsUsed > 0 && (
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              This would be attempt {rules.attemptsUsed + 1} of {rules.maxAttempts}. If you reload or
              lose your connection, starting again returns you to the same exam on the same clock.
            </p>
          )}

          {rules && rules.fullscreenRequired !== false && !isFullscreenCapable(document, document.documentElement) && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-4 text-sm">
              This exam is taken in full screen, and this browser cannot do it. Phone and tablet
              browsers, and windows opened inside another app, do not support full screen — open the
              site in Chrome, Edge or Firefox on a computer to sit the exam.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-4 text-sm"
            >
              <p className="font-medium">The exam could not be prepared</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={startExam}
              disabled={loading || exhausted || !!error}
              className="min-h-[44px] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Preparing…" : "Start the exam"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="min-h-[44px] px-6 py-3 rounded-lg font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Not yet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Attempt {sitting.attemptNumber} · {questions.length} questions · {answered} answered
            </p>
            <p className="font-semibold text-gray-900 dark:text-gray-100" role="timer">
              {timeLeft === 0 ? "Time is up" : `${clock} left`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400">
              {staleConnection
                ? "Reconnecting…"
                : savedAt
                  ? `Saved at ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Nothing saved yet"}
            </p>
            <button
              type="button"
              onClick={() => handIn(false)}
              disabled={submitting || !!ending}
              className="min-h-[44px] px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm disabled:opacity-50"
            >
              {submitting
                ? "Submitting…"
                : ending
                  ? "Sitting closed"
                  : `Submit (${questions.length - answered} unanswered)`}
            </button>
          </div>
        </div>
        <ProctorBanner level={proctor.level} />
        {ending && (
          <p
            role="status"
            className="bg-red-600 text-white px-4 py-2 text-center text-sm font-medium"
          >
            {ending} Handing your paper in now.
          </p>
        )}
      </header>

      {notice && (
        <div
          className="fixed inset-0 z-20 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              We noticed something
            </h2>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">{notice.label}.</span> It is on your attempt record now,
              with the time our server saw it. The clock kept running the whole time.
            </p>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Keep going — nothing you have answered is lost. Your instructor sees this same record.
            </p>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                enterFullscreen(document.documentElement).catch(() => {});
              }}
              className="mt-5 min-h-[44px] w-full px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Back to the exam
            </button>
          </div>
        </div>
      )}

      {cover.covered && !ending && (
        <div
          className="fixed inset-0 z-30 bg-gray-900 text-white flex items-center justify-center p-6"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="cover-title"
        >
          <div className="w-full max-w-md text-center">
            <h2 id="cover-title" className="text-2xl font-semibold">
              Full screen is required
            </h2>
            <p className="mt-3 text-sm text-gray-300">
              Your questions are covered while the exam is not in full screen, so nothing can be read
              over a shoulder or compared against another window. Your answers are safe and the clock
              keeps running.
            </p>
            <p className="mt-4 text-sm text-gray-300">
              {Math.max(0, cover.budgetSeconds - cover.coveredSeconds)}s left before this sitting
              closes itself ({cover.budgetSeconds}s outside full screen is the whole allowance).
            </p>
            <button
              type="button"
              onClick={() => enterFullscreen(document.documentElement).catch(() => {})}
              className="mt-6 min-h-[48px] w-full px-6 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold"
            >
              Go back to full screen
            </button>
            <button
              type="button"
              onClick={() => handIn(false)}
              className="mt-3 min-h-[44px] w-full px-6 rounded-lg text-sm text-gray-300 hover:text-white"
            >
              Hand my paper in now
            </button>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-5xl w-full mx-auto p-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section ref={paper} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          {submitting ? (
            <p className="text-gray-700 dark:text-gray-300">Handing your paper in…</p>
          ) : current ? (
            <div className="select-none">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Question {index + 1} of {questions.length}
                </p>
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  {answers[current.id] ? `Answered ${answers[current.id]}` : "Not answered"}
                </span>
              </div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-5">
                {current.questionText}
              </h2>
              <div className="space-y-2">
                {["A", "B", "C", "D"].map((option) => (
                  <label
                    key={option}
                    className={`flex items-start gap-3 min-h-[44px] p-4 rounded-lg border cursor-pointer transition-colors ${
                      answers[current.id] === option
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${current.id}`}
                      value={option}
                      checked={answers[current.id] === option}
                      onChange={() => chooseAnswer(current.id, option)}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <span className="font-semibold mr-1">{option}.</span>
                      {current[`option${option}`]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No questions were served for this attempt.</p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="min-h-[44px] px-5 rounded-lg font-semibold text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex gap-1 overflow-x-auto py-1">
              {questions.map((question, position) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-label={`Question ${position + 1}${answers[question.id] ? ", answered" : ""}`}
                  aria-current={position === index ? "true" : undefined}
                  className={`w-9 h-9 flex-shrink-0 rounded-md text-xs font-semibold ${
                    position === index
                      ? "bg-indigo-600 text-white"
                      : answers[question.id]
                        ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {position + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              disabled={index >= questions.length - 1}
              className="min-h-[44px] px-5 rounded-lg font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <ExamProctorPanel entries={proctor.entries} points={proctor.points} level={proctor.level} />

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Camera</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Optional. One small frame a minute, so a reviewer can see the room. Declining is
              allowed.
            </p>
            <button
              type="button"
              onClick={cameraOn ? stopCamera : enableCamera}
              className="min-h-[44px] w-full px-4 rounded-lg text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
            >
              {cameraOn ? "Stop the camera" : "Allow the camera"}
            </button>
            {cameraMessage && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{cameraMessage}</p>}
            <video ref={video} className="sr-only" playsInline muted aria-hidden="true" tabIndex={-1} />
          </div>

          {!canHandIn && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Submitting is always allowed. Handing in before{" "}
              {Math.ceil((sitting.minDurationSeconds || 0) / 60)} minutes of work is recorded as a
              too-fast submission and flagged for review.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-4 text-sm"
            >
              <p className="font-medium">Your paper is not with us yet</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => handIn(false)}
                className="mt-3 min-h-[44px] px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm"
              >
                Try handing in again
              </button>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
};

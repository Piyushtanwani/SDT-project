import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import Sidebar from "./AdminSlidebar";
import IntegrityReportSheet from "./IntegrityReportSheet";
import { API_BASE_URL } from "../config/api";
import { formatDuration, formatServerTime } from "../utils/reportFormat";

const ENDPOINT = `${API_BASE_URL}/api/admin/exam-integrity`;

const VERDICTS = {
  CLEAN: { label: "Clean", chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  REVIEW: { label: "Needs review", chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  FLAGGED: { label: "Flagged", chip: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" },
};

const STATUSES = {
  IN_PROGRESS: "Still sitting",
  SUBMITTED: "Handed in",
  EXPIRED: "Ran out of time",
  VOIDED: "Voided by a reviewer",
};

const SEVERITY = {
  HIGH: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  LOW: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
};

/**
 * `param` asks the register for one verdict server-side. The default slice is the whole
 * undecided queue, which the overview already returns worst-first across every sitting —
 * narrower than filtering the 50 latest by hand, and it matches the number on the card.
 */
const FILTERS = [
  { key: "QUEUE", label: "Needs a decision", queue: true },
  { key: "FLAGGED", label: "Flagged", param: "FLAGGED" },
  { key: "REVIEW", label: "Watch list", param: "REVIEW" },
  { key: "CLEAN", label: "Clean", param: "CLEAN" },
  { key: "ALL", label: "All sittings", param: null },
];

const Badge = ({ value }) => {
  const style = VERDICTS[value] || VERDICTS.CLEAN;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${style.chip}`}>
      {style.label}
    </span>
  );
};

const Stat = ({ label, value, hint, onClick }) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={`rounded-xl border border-gray-200/70 dark:border-white/10 bg-white dark:bg-gray-800 p-4 text-left transition ${
        onClick ? "hover:border-indigo-300 dark:hover:border-indigo-500/50 cursor-pointer" : ""
      }`}
    >
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-200">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </Tag>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
    <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">{children}</p>
  </div>
);

const SnapshotGallery = ({ snapshots, onOpen }) => {
  if (!snapshots.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No frames. Camera access is optional, so a learner who declined it simply has no pictures —
        that is recorded as a choice, not a fault.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {snapshots.map((shot, index) => (
        <button
          key={shot.id}
          type="button"
          onClick={() => onOpen(index)}
          className="group rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <img src={shot.imageDataUrl} alt={`${shot.label} frame`} className="h-28 w-full object-cover" />
          <span className="block px-2 py-1.5 text-left text-xs text-gray-600 dark:text-gray-300">
            {shot.label} · {formatServerTime(shot.serverReceivedAt)}
          </span>
        </button>
      ))}
    </div>
  );
};

const Lightbox = ({ snapshots, index, onClose, onStep }) => {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      // Capture phase, so this runs before the panel's own Escape handler on the same
      // window: closing a frame must not also close the record behind it.
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "ArrowRight") onStep(1);
      if (event.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep]);

  const shot = snapshots[index];
  if (!shot) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Captured frame"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <img
        src={shot.imageDataUrl}
        alt={`${shot.label} frame`}
        className="max-h-[75vh] max-w-full rounded-lg"
        onClick={(event) => event.stopPropagation()}
      />
      <div className="mt-4 flex items-center gap-3" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => onStep(-1)} aria-label="Previous frame"
          className="min-h-[44px] rounded-lg bg-white/10 p-2 text-white hover:bg-white/20">
          <ChevronLeft size={20} />
        </button>
        <p className="text-sm text-white">
          {shot.label} · {formatServerTime(shot.serverReceivedAt)} · {index + 1} of {snapshots.length}
        </p>
        <button type="button" onClick={() => onStep(1)} aria-label="Next frame"
          className="min-h-[44px] rounded-lg bg-white/10 p-2 text-white hover:bg-white/20">
          <ChevronRight size={20} />
        </button>
        <button type="button" onClick={onClose} aria-label="Close"
          className="min-h-[44px] rounded-lg bg-white/10 p-2 text-white hover:bg-white/20">
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

const Detail = ({ attemptId, onClose, onChanged }) => {
  const [attempt, setAttempt] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState("CLEAN");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [frame, setFrame] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    // Two documents, one sitting: the working record (rows, frames, the decision form's current
    // values) and the report the server writes from it. Reloading both after a decision is what
    // keeps the printed copy and the on-screen verdict telling the same story.
    Promise.all([
      axios.get(`${ENDPOINT}/attempts/${attemptId}`),
      axios.get(`${ENDPOINT}/attempts/${attemptId}/report`),
    ])
      .then(([detail, sheet]) => {
        setAttempt(detail.data);
        setReport(sheet.data);
        setVerdict(detail.data.integrity || "CLEAN");
        setNote(detail.data.reviewNote || "");
      })
      .catch((err) => setError(err.response?.data?.message || "We could not open this attempt."))
      .finally(() => setLoading(false));
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (nextVerdict) => {
    try {
      setSaving("verdict");
      setActionError("");
      await axios.post(`${ENDPOINT}/attempts/${attemptId}/review`, { verdict: nextVerdict, note });
      await onChanged();
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || "The decision was not saved.");
    } finally {
      setSaving("");
    }
  };

  const voidAttempt = async () => {
    try {
      setSaving("void");
      setActionError("");
      await axios.post(`${ENDPOINT}/attempts/${attemptId}/void`, { note });
      setConfirmVoid(false);
      await onChanged();
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || "The attempt was not voided.");
    } finally {
      setSaving("");
    }
  };

  const step = (delta) =>
    setFrame((current) => {
      const total = attempt?.snapshots?.length || 0;
      return total ? (current + delta + total) % total : null;
    });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/40"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-label="Attempt integrity record"
        onClick={(event) => event.stopPropagation()}
        className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto bg-white dark:bg-gray-900 shadow-2xl p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Attempt #{attemptId}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Everything here was weighted and stamped by the server.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="min-h-[44px] rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {loading && <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
        {error && (
          <div className="mt-6 rounded-lg bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {attempt && (
          <div className="mt-6 space-y-7">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Learner">
                {attempt.userName}
                <span className="block text-xs text-gray-500 dark:text-gray-400">{attempt.userEmail}</span>
              </Field>
              <Field label="Course">{attempt.courseName}</Field>
              <Field label="Verdict"><Badge value={attempt.integrity} /></Field>
              <Field label="Status">
                {STATUSES[attempt.status] || attempt.status}
                {attempt.status === "VOIDED" && (
                  <span className="block text-xs text-red-600 dark:text-red-300">
                    No certificate can ride on this sitting. It still counts as one of their attempts.
                  </span>
                )}
              </Field>
              <Field label="Score">
                {attempt.score}% · {attempt.correctCount ?? "—"} of {attempt.totalQuestions ?? "—"} correct
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {attempt.passed ? "Above the pass mark" : "Below the pass mark"}
                </span>
              </Field>
              <Field label="Signals">
                {attempt.violationCount} weighted · weight {attempt.violationPoints}
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {attempt.events.length} rows on the timeline, including the ones that cost nothing
                </span>
              </Field>
              <Field label="Started">{formatServerTime(attempt.startedAt)}</Field>
              <Field label="Deadline">{formatServerTime(attempt.deadline)}</Field>
              <Field label="Handed in">{formatServerTime(attempt.submittedAt)}</Field>
              <Field label="Time used">{formatDuration(attempt.durationSeconds)}</Field>
              <Field label="Certificate">
                {attempt.certificateIssued ? (
                  <span className="text-emerald-700 dark:text-emerald-300">Already issued</span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Not issued</span>
                )}
              </Field>
              <Field label="Browser">
                <span className="break-all text-xs text-gray-600 dark:text-gray-300">
                  {attempt.userAgent || "Not reported"}
                </span>
              </Field>
            </div>

            {attempt.reviewedBy && (
              <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Last decision by {attempt.reviewedBy} · {formatServerTime(attempt.reviewedAt)}
                </p>
                {attempt.reviewNote && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{attempt.reviewNote}</p>
                )}
              </div>
            )}

            <IntegrityReportSheet report={report} variant="reviewer" />

            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Integrity timeline ({attempt.events.length})
              </h3>
              {attempt.events.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Nothing was reported during this sitting. A quiet timeline is not proof of honesty —
                  the browser only sees what a browser can see.
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {attempt.events.map((event) => (
                    <li key={event.id} className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY[event.severity] || SEVERITY.LOW}`}>
                          {event.severity} · {event.points > 0 ? `weight ${event.points}` : "no weight"}
                        </span>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{event.label}</p>
                        <p className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                          {formatServerTime(event.serverReceivedAt)}
                          {event.elapsedSeconds !== null && ` · ${formatDuration(event.elapsedSeconds)} in`}
                        </p>
                      </div>
                      {event.detail && (
                        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">{event.detail}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <Camera size={16} /> Captured frames ({attempt.snapshots.length})
              </h3>
              <div className="mt-3">
                <SnapshotGallery snapshots={attempt.snapshots} onOpen={setFrame} />
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 dark:border-white/10 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Your decision
              </h3>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Overwriting the automatic verdict is a human act and is written to the timeline with
                your name. The candidate sees this note on their result page.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["CLEAN", "REVIEW", "FLAGGED"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setVerdict(option)}
                    className={`min-h-[44px] rounded-lg px-4 text-sm font-medium border transition ${
                      verdict === option
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
                        : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {VERDICTS[option].label}
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Reason for the decision (optional, shown to the learner)"
                className="mt-3 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 p-3 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
              {actionError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-300">{actionError}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!!saving}
                  onClick={() => save(verdict)}
                  className="min-h-[44px] rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving === "verdict" ? "Saving…" : `Mark as ${VERDICTS[verdict].label}`}
                </button>
                {confirmVoid ? (
                  <button
                    type="button"
                    disabled={!!saving}
                    onClick={voidAttempt}
                    className="min-h-[44px] rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {saving === "void" ? "Voiding…" : "Confirm: void this sitting"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!!saving}
                    onClick={() => setConfirmVoid(true)}
                    className="min-h-[44px] rounded-lg border border-red-200 dark:border-red-800 px-5 text-sm font-semibold text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                  >
                    Void sitting
                  </button>
                )}
                {confirmVoid && (
                  <button type="button" onClick={() => setConfirmVoid(false)}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    Cancel
                  </button>
                )}
              </div>
              {confirmVoid && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                  Voiding removes this result's power to carry a certificate but keeps the score and
                  the whole timeline on the record — and it still costs the learner one of their attempts.
                </p>
              )}
            </section>
          </div>
        )}

        {frame !== null && attempt && (
          <Lightbox snapshots={attempt.snapshots} index={frame} onClose={() => setFrame(null)} onStep={step} />
        )}
      </motion.aside>
    </motion.div>
  );
};

const AdminExamIntegrity = () => {
  const [overview, setOverview] = useState(null);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("QUEUE");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const wanted = FILTERS.find((f) => f.key === filter);
    try {
      const { data: summary } = await axios.get(`${ENDPOINT}/overview`);
      setOverview(summary);
      if (wanted.queue) {
        setRows(Array.isArray(summary.awaitingReview) ? summary.awaitingReview : []);
      } else {
        const params = wanted.param ? { integrity: wanted.param } : {};
        const { data } = await axios.get(`${ENDPOINT}/attempts`, { params });
        setRows(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setLoadError(err.response?.data?.message || "We could not load the integrity register.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searchTerm = query.trim().toLowerCase();
  const visible = searchTerm
    ? rows.filter((row) =>
        [row.userName, row.userEmail, row.courseName].some((part) =>
          (part || "").toLowerCase().includes(searchTerm)))
    : rows;

  const awaiting = overview?.awaitingReview?.length || 0;

  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-7xl"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Exam Integrity
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                Every signal is weighted, stamped and stored by the server. A browser can hide what
                it hides, so a verdict is a human decision about evidence — not an automatic grade.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="min-h-[44px] rounded-lg border border-gray-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 inline-flex items-center gap-2"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {loadError && (
            <div className="mt-6 rounded-lg bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-200">
              {loadError}
            </div>
          )}

          {overview && (
            <>
              <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label="Needs a decision" value={awaiting}
                  hint="Flagged or on the watch list, never reviewed"
                  onClick={() => setFilter("QUEUE")} />
                <Stat label="In progress now" value={overview.inProgress}
                  hint="Sittings open on the server clock" />
                <Stat label="Sittings today" value={overview.attemptsToday}
                  hint="Started on this calendar day" />
                <Stat label="Voided" value={overview.voided}
                  hint="Thrown out; the sitting is still spent" />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                These counts cover the {overview.totalAttempts} most recent sittings; the decision
                queue spans every attempt on record, worst first.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={`min-h-[44px] rounded-full px-4 text-sm font-medium border transition ${
                  filter === option.key
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
                    : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                {option.label}
              </button>
            ))}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search learner or course"
              className="min-h-[44px] ml-auto w-full sm:w-64 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>

          {loading ? (
            <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">Loading the register…</p>
          ) : visible.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 dark:border-white/10 p-10 text-center">
              <ShieldCheck size={28} className="mx-auto text-gray-400" />
              <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                {searchTerm
                  ? "No sitting in this slice matches that search."
                  : filter === "QUEUE"
                    ? "Nothing is waiting on a decision."
                    : "No sitting in the latest register carries this verdict."}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {searchTerm
                  ? "Clear the search, or widen the filter."
                  : "Try another filter, or switch to all sittings."}
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
              <div className="hidden md:grid md:grid-cols-12 gap-2 bg-gray-50 dark:bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <p className="md:col-span-3">Learner</p>
                <p className="md:col-span-2">Course</p>
                <p className="md:col-span-2">Signals</p>
                <p className="md:col-span-2">Score</p>
                <p className="md:col-span-2">Started</p>
                <p className="md:col-span-1">Verdict</p>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-white/10">
                {visible.map((row) => (
                  <li key={row.attemptId}>
                    <button
                      type="button"
                      onClick={() => setOpen(row.attemptId)}
                      className="w-full text-left px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition
                        md:grid md:grid-cols-12 md:gap-2 md:items-center"
                    >
                      <div className="md:col-span-3 flex items-center gap-2">
                        {row.integrity === "FLAGGED" ? (
                          <ShieldAlert size={16} className="shrink-0 text-red-600 dark:text-red-400" />
                        ) : (
                          <ShieldCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                            {row.userName}
                          </span>
                          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                            {row.userEmail}
                          </span>
                        </span>
                      </div>
                      <p className="md:col-span-2 mt-2 md:mt-0 truncate text-sm text-gray-700 dark:text-gray-200">
                        {row.courseName}
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          attempt {row.attemptNumber ?? "—"}
                        </span>
                      </p>
                      <p className="md:col-span-2 mt-2 md:mt-0 text-sm text-gray-700 dark:text-gray-200">
                        {row.violationCount} weighted · weight {row.violationPoints}
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {row.eventCount} timeline rows · {row.snapshotCount} frames
                        </span>
                      </p>
                      <p className="md:col-span-2 mt-2 md:mt-0 text-sm text-gray-700 dark:text-gray-200">
                        {row.score}%
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {STATUSES[row.status] || row.status} · {formatDuration(row.durationSeconds)}
                        </span>
                      </p>
                      <p className="md:col-span-2 mt-2 md:mt-0 text-sm text-gray-700 dark:text-gray-200">
                        {formatServerTime(row.startedAt)}
                        <span className="block text-xs text-gray-500 dark:text-gray-400">server time</span>
                      </p>
                      <div className="md:col-span-1 mt-3 md:mt-0">
                        <Badge value={row.integrity} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {open !== null && (
          <Detail attemptId={open} onClose={() => setOpen(null)} onChanged={load} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminExamIntegrity;

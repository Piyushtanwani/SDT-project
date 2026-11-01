import { useState } from "react";
import { formatClock, formatDuration, formatServerTime, readable, shortAgent } from "../utils/reportFormat";
import { printReport } from "../utils/reportDocument";

/**
 * The integrity report one sitting earns, rendered from the server's own document.
 *
 * Both readers get this same component, because the record a candidate is shown at their result
 * page and the record an invigilator decides on must not drift apart: same findings, same weights,
 * same wording. The differences are only what each side is allowed to see — a learner is not shown
 * the IP address their sitting came from, and a reviewer reads the last detail attached to each
 * signal. `variant` switches that lens, never the substance.
 */

/** The server's three bands, in the words a candidate reads rather than the constant it stores. */
const RISK_EXPLAINED = {
  LOW: "Nothing weighted landed on this sitting, or only low-weight signals.",
  MEDIUM: "Enough signals to be worth a human reading.",
  HIGH: "Several weighted signals, or one serious one, on the same sitting.",
};

const Fact = ({ label, children, hint }) => (
  <div>
    <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-sm text-gray-900 dark:text-gray-100">
      {children}
      {hint && <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
    </dd>
  </div>
);

export const IntegrityReportSheet = ({ report, variant = "learner" }) => {
  const [printBlocked, setPrintBlocked] = useState(false);
  if (!report) return null;

  const worked = report.worked || {};
  const device = report.device || {};
  const camera = report.camera || {};
  const certification = report.certification || null;
  const reviewer = variant === "reviewer";
  const groups = report.groups || [];
  const findings = report.findings || [];
  const covered = worked.coveredSeconds || 0;
  const allowance = worked.coveredAllowanceSeconds || 0;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {reviewer ? "Integrity report" : "Proctoring report"}
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Written by our server from the record of this sitting: {report.signalCount} signal
            {report.signalCount === 1 ? "" : "s"}, risk band {readable(report.riskBand)} (
            {report.riskScore} point{report.riskScore === 1 ? "" : "s"}). Generated{" "}
            {formatClock(report.reportGeneratedAt)}.
          </p>
          {reviewer && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {report.candidateName} · {report.candidateEmail || "no address on file"} · attempt{" "}
              {report.attemptNumber ?? "—"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPrintBlocked(!printReport(report, { variant }))}
          className="shrink-0 min-h-[36px] px-3 rounded-lg text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
        >
          Print or save as PDF
        </button>
      </div>

      {printBlocked && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          Your browser blocked the report window. Allow pop-ups for this site to print it or save it
          as a PDF.
        </p>
      )}

      {report.verdictMeaning && (
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{report.verdictMeaning}</p>
      )}

      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
        <Fact label="Started">{formatServerTime(worked.startedAt)}</Fact>
        <Fact label="Closed">{worked.submittedAt ? formatServerTime(worked.submittedAt) : "not closed yet"}</Fact>
        <Fact label="Worked">{formatDuration(worked.workedSeconds)}</Fact>
        <Fact label="Answered">{`${worked.answeredCount ?? 0} of ${report.totalQuestions || "—"}`}</Fact>
        <Fact label="Per answer">{worked.secondsPerAnswer ? `${worked.secondsPerAnswer}s` : "—"}</Fact>
        <Fact
          label="Out of full screen"
          hint={covered > allowance ? "over the allowance the sitting allows" : `of the ${allowance}s allowed`}
        >
          {`${covered}s · ${worked.fullscreenExits ?? 0} exit${worked.fullscreenExits === 1 ? "" : "s"}`}
        </Fact>
        <Fact label="Camera">{`${readable(camera.state)} · ${camera.frames ?? 0} frame${camera.frames === 1 ? "" : "s"}`}</Fact>
        <Fact label="Browser">{shortAgent(device.userAgent)}</Fact>
        <Fact label="Verdict">
          {report.verdict}
          {RISK_EXPLAINED[report.riskBand] ? ` — ${RISK_EXPLAINED[report.riskBand]}` : ""}
        </Fact>
        {reviewer && (
          <>
            <Fact label="Address">{device.clientIp || "not recorded"}</Fact>
            <Fact
              label="Other sittings from it"
              hint="A shared address is context — a family, a hostel, a carrier — never a finding on its own"
            >
              {device.otherAttemptsFromSameIp ?? 0}
            </Fact>
            <Fact label="Status">{readable(report.status)}</Fact>
          </>
        )}
      </dl>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Findings
      </h3>
      {findings.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Nothing on this record rose to a finding. A quiet sitting is not proof of honesty — a
          browser only sees what a browser can see.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {findings.map((line, position) => (
            <li key={position} className="flex items-start text-sm text-gray-800 dark:text-gray-200">
              <span className="mr-2 mt-1 text-indigo-600 dark:text-indigo-400" aria-hidden="true">
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {groups.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Signals, counted
          </h3>
          <table className="mt-2 w-full text-left text-xs">
            <thead className="text-gray-500 dark:text-gray-400">
              <tr>
                <th className="py-1 font-medium">What</th>
                <th className="py-1 font-medium">Severity</th>
                <th className="py-1 font-medium text-right">Times</th>
                <th className="py-1 font-medium text-right">Weight</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 dark:text-gray-200">
              {groups.map((group) => (
                <tr key={group.kind} className="border-t border-gray-100 dark:border-gray-700 align-top">
                  <td className="py-1.5 pr-2">
                    {group.label}
                    {!group.counted && <span className="ml-2 text-gray-500 dark:text-gray-400">(no weight)</span>}
                    {reviewer && group.lastDetail && (
                      <span className="block text-gray-500 dark:text-gray-400">{group.lastDetail}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2">{group.severity}</td>
                  <td className="py-1.5 text-right">{group.count}</td>
                  <td className="py-1.5 text-right">
                    {group.totalPoints}
                    <span className="text-gray-500 dark:text-gray-400"> ({group.pointsEach} ea.)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {certification && (
        <div className="mt-5 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Credential
          </h3>
          {certification.issued ? (
            <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
              This sitting carries certificate{" "}
              <span className="font-mono text-xs">{certification.credentialId}</span>.
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
              No credential stands on this sitting.
              {certification.notIssuedBecause && (
                <span className="block mt-1 text-gray-600 dark:text-gray-300">
                  {certification.notIssuedBecause}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {report.review && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Decision by {report.review.reviewerName || "a reviewer"} ·{" "}
            {formatServerTime(report.review.reviewedAt)}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Verdict recorded: {report.review.verdict}
          </p>
          {report.review.note && (
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{report.review.note}</p>
          )}
        </div>
      )}
    </section>
  );
};

export default IntegrityReportSheet;

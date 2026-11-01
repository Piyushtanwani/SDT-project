import { formatClock, formatDuration, formatServerTime, readable, shortAgent } from "./reportFormat";

/**
 * The report as a standalone document, for the paper.
 *
 * Printing the live page would drag the navigation, the review form and the theme's dark surfaces
 * onto it, so the document is written on its own: plain black on white, A4, and worded exactly the
 * way the on-screen sheet words it — same findings, same weights, same timestamps. A reviewer can
 * quote it, a candidate can keep it, and neither of them needs the app open to read what was
 * recorded about them.
 */

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Names, notes and dropped-file labels all arrive from outside, and all of them reach this HTML. */
const esc = (value) =>
  value === null || value === undefined ? "" : String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);

const cell = (label, value, hint) =>
  `<div class="fact"><span class="k">${esc(label)}</span><span class="v">${esc(value)}</span>` +
  `${hint ? `<span class="h">${esc(hint)}</span>` : ""}</div>`;

const factRows = (report, reviewer) => {
  const worked = report.worked || {};
  const device = report.device || {};
  const camera = report.camera || {};
  const covered = worked.coveredSeconds || 0;
  const allowance = worked.coveredAllowanceSeconds || 0;
  const rows = [
    cell("Started", formatServerTime(worked.startedAt)),
    cell("Closed", worked.submittedAt ? formatServerTime(worked.submittedAt) : "not closed yet"),
    cell("Worked", formatDuration(worked.workedSeconds)),
    cell("Answered", `${worked.answeredCount ?? 0} of ${report.totalQuestions || "—"}`),
    cell("Per answer", worked.secondsPerAnswer ? `${worked.secondsPerAnswer}s` : "—"),
    cell("Out of full screen", `${covered}s · ${worked.fullscreenExits ?? 0} exit(s)`,
      covered > allowance ? "over the allowance the sitting allows" : `of the ${allowance}s allowed`),
    cell("Camera", `${readable(camera.state)} · ${camera.frames ?? 0} frame(s)`),
    cell("Browser", shortAgent(device.userAgent)),
    cell("Verdict", `${report.verdict} — ${readable(report.riskBand)} risk (${report.riskScore} points)`),
  ];

  if (reviewer) {
    rows.push(cell("Address", device.clientIp || "not recorded"));
    rows.push(cell("Other sittings from it", `${device.otherAttemptsFromSameIp ?? 0}`,
      "a shared address is context, never a finding on its own"));
    rows.push(cell("Status", readable(report.status)));
  }
  return rows.join("");
};

const findingsBlock = (findings) => {
  if (!findings.length) {
    return '<p class="empty">Nothing on this record rose to a finding. A quiet sitting is not proof of ' +
      "honesty — a browser only sees what a browser can see.</p>";
  }
  return `<ul>${findings.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>`;
};

const signalsBlock = (groups, reviewer) => {
  if (!groups.length) {
    return '<p class="empty">No signals were recorded on this sitting.</p>';
  }
  const head = "<tr><th>What was recorded</th><th>Severity</th><th class='n'>Times</th>" +
    "<th class='n'>Weight</th></tr>";
  const body = groups
    .map((group) => {
      const detail = reviewer && group.lastDetail ? `<div class="d">${esc(group.lastDetail)}</div>` : "";
      return `<tr><td>${esc(group.label)}${group.counted ? "" : " <em>(no weight)</em>"}${detail}</td>` +
        `<td>${esc(group.severity)}</td><td class="n">${group.count}</td>` +
        `<td class="n">${group.totalPoints} <span class="m">(${group.pointsEach} ea.)</span></td></tr>`;
    })
    .join("");
  return `<table>${head}${body}</table>`;
};

const credentialBlock = (certification) => {
  if (!certification) return "";
  if (certification.issued) {
    return `<p><strong>Certificate:</strong> this sitting carries credential ` +
      `<code>${esc(certification.credentialId)}</code>.</p>`;
  }
  return `<p><strong>Certificate:</strong> no credential stands on this sitting.` +
    `${certification.notIssuedBecause ? ` <span>${esc(certification.notIssuedBecause)}</span>` : ""}</p>`;
};

const reviewBlock = (review) => {
  if (!review) {
    return '<p class="empty">No human decision has been recorded on this sitting yet.</p>';
  }
  return `<p><strong>Decision</strong> by ${esc(review.reviewerName || "a reviewer")} · ` +
    `${esc(formatServerTime(review.reviewedAt))} · verdict recorded: ${esc(review.verdict)}</p>` +
    (review.note ? `<p class="note">${esc(review.note)}</p>` : "");
};

export const reportHtml = (report, { variant = "learner" } = {}) => {
  const reviewer = variant === "reviewer";
  const findings = report.findings || [];
  const groups = report.groups || [];
  const title = reviewer ? "Exam integrity report" : "Exam proctoring report";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} — attempt ${esc(report.attemptId)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  body { margin: 0; padding: 24px; color: #111827; background: #fff;
         font: 13px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  h1 { font-size: 19px; margin: 0; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #4b5563;
       margin: 26px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .who { margin-top: 6px; color: #4b5563; font-size: 12px; }
  .meaning { margin: 14px 0 0; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px;
             background: #f9fafb; }
  .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; margin-top: 6px; }
  .fact .k { display: block; font-size: 11px; color: #6b7280; }
  .fact .v { display: block; }
  .fact .h { display: block; font-size: 11px; color: #6b7280; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #4b5563; }
  td.n, th.n { text-align: right; white-space: nowrap; }
  .d, .m { color: #6b7280; font-size: 11px; }
  .empty { color: #6b7280; }
  .note { padding: 10px 12px; border-left: 3px solid #d1d5db; background: #f9fafb; }
  footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e5e7eb;
           font-size: 11px; color: #6b7280; }
</style>
</head>
<body>
<h1>${esc(title)}</h1>
<p class="who">${esc(report.candidateName || "Unknown learner")} · ${esc(report.courseName || "Unknown course")}
 · attempt ${esc(report.attemptNumber ?? "—")} · sitting #${esc(report.attemptId)}</p>
${report.candidateEmail ? `<p class="who">${esc(report.candidateEmail)}</p>` : ""}
<p class="meaning">${esc(report.verdictMeaning || "")}</p>
<h2>What the sitting looked like</h2>
<div class="facts">${factRows(report, reviewer)}</div>
<h2>Findings</h2>
${findingsBlock(findings)}
<h2>Signals, counted</h2>
${signalsBlock(groups, reviewer)}
<h2>Certificate and decision</h2>
${credentialBlock(report.certification)}
${reviewBlock(report.review)}
<footer>
  Every number above was computed by the server from the rows it holds, stamped on its own clock at
  ${esc(formatServerTime(report.reportGeneratedAt))} (${esc(formatClock(report.reportGeneratedAt))}).
  A browser reports what a browser can see; nothing here is the candidate's own claim, and the
  verdict above is the server's weighting, which a reviewer may overwrite in their decision.
</footer>
</body>
</html>`;
};

/** Returns false when the browser blocked the window, so the caller can say so instead of lying. */
export const printReport = (report, options) => {
  const win = window.open("", "_blank", "width=920,height=760");
  if (!win || !win.document) return false;
  win.document.open();
  win.document.write(reportHtml(report, options));
  win.document.close();
  win.focus();
  win.print();
  return true;
};

import { reportHtml } from "./reportDocument";

const report = (overrides = {}) => ({
  attemptId: 12,
  attemptNumber: 2,
  candidateName: "Ismail Mansuri",
  candidateEmail: null,
  courseName: "Cloud Foundations",
  status: "SUBMITTED",
  verdict: "REVIEW",
  verdictMeaning: "What was recorded added up to a review.",
  riskScore: 5,
  riskBand: "MEDIUM",
  signalCount: 2,
  score: 84,
  totalQuestions: 10,
  passed: true,
  reportGeneratedAt: "2026-11-01T18:34:06.699",
  worked: {
    startedAt: "2026-11-01T17:50:00",
    submittedAt: "2026-11-01T18:20:00",
    workedSeconds: 1800,
    answeredCount: 9,
    secondsPerAnswer: 200,
    coveredSeconds: 41,
    coveredAllowanceSeconds: 60,
    fullscreenExits: 2,
  },
  device: { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0", clientIp: "203.0.113.9", otherAttemptsFromSameIp: 0 },
  camera: { state: "ALLOWED", frames: 4 },
  review: null,
  certification: { issued: true, credentialId: "SDT-ABCD-1234", notIssuedBecause: null },
  groups: [
    { kind: "FULLSCREEN_EXIT", label: "Left full screen", severity: "HIGH", count: 2, pointsEach: 3, totalPoints: 6, counted: true, lastDetail: "Out of full screen for 41s." },
    { kind: "HEARTBEAT", label: "Still here", severity: "LOW", count: 1, pointsEach: 0, totalPoints: 0, counted: false, lastDetail: null },
  ],
  findings: ["Left full screen twice, for 41s in total."],
  ...overrides,
});

describe("the printable report", () => {
  it("writes a plain document that says what the sitting was", () => {
    const html = reportHtml(report());

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Exam proctoring report");
    expect(html).toContain("Ismail Mansuri");
    expect(html).toContain("Left full screen twice, for 41s in total.");
    expect(html).toContain("Out of full screen");
    expect(html).toContain("41s");
    expect(html).toContain("SDT-ABCD-1234");
  });

  it("escapes every piece of text that came from outside the server", () => {
    // Candidate names, notes and the file names in a dropped-file signal are all written by people
    // — or by a script — and none of them get to become markup in a document a reviewer opens.
    const html = reportHtml(
      report({
        candidateName: '<script>alert("x")</script>',
        findings: ['Dropped: <img src=x onerror="steal()">'],
        review: { verdict: "FLAGGED", note: "<b>not markup</b>", reviewerName: "A & B", reviewedAt: "2026-11-01T19:00:00" },
      }),
      { variant: "reviewer" }
    );

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>not markup</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B");
  });

  it("shows the reviewer the address and keeps it off the learner's copy", () => {
    expect(reportHtml(report(), { variant: "reviewer" })).toContain("203.0.113.9");
    expect(reportHtml(report(), { variant: "learner" })).not.toContain("203.0.113.9");
  });

  it("says a credential does not stand, in words a learner can read", () => {
    const html = reportHtml(
      report({ certification: { issued: false, credentialId: null, notIssuedBecause: "The sitting was voided by an invigilator." } })
    );

    expect(html).toContain("no credential stands on this sitting");
    expect(html).toContain("The sitting was voided by an invigilator.");
  });
});

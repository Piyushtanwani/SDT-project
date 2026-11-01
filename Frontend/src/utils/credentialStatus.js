/**
 * What a credential's own record says about it.
 *
 * A credential ID can be genuine and still not stand: an invigilator can withdraw the paper it was
 * printed on. Two pages have to say that — the public verification form and the shareable link a
 * learner sends an employer — and they must not improvise different wording about the same fact, so
 * the reading is done once here and only the layout differs.
 */

export const describeCredential = (certificate) => {
  const withdrawn = String(certificate?.status || "").toUpperCase() === "REVOKED";
  const proctoring = certificate?.proctoringLine || null;

  if (withdrawn) {
    return {
      stands: false,
      headline: "This credential was withdrawn",
      detail:
        certificate?.withdrawalReason ||
        "An invigilator withdrew the sitting this certificate was printed from.",
      when: certificate?.withdrawnAt || null,
      tone: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200",
      proctoring,
    };
  }

  return {
    stands: true,
    headline: "Verified certificate",
    detail: "This credential is genuine and stands on the sitting that earned it.",
    when: null,
    tone: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200",
    proctoring,
  };
};

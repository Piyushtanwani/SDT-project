# Testing

Run both suites:

```bash
cd Backend && ./mvnw test        # 15 tests, 0 failures (2026-10-28)
cd Frontend && CI=true npm test  # 3 tests, 0 failures (2026-10-28)
```

The table maps the five rules in [DESIGN.md](DESIGN.md) to the tests that enforce them. A dash in the Test column means the rule has no test. In every citation, `.../` abbreviates `Backend/src/main/java/com/elearning/`.

| Rule | Test | file:line | If untested — what stops you |
| --- | --- | --- | --- |
| 1. A Learner cannot sign in before verifying their OTP. | — | — | No Spring integration test and no EmailService double. The issue path (`Backend/src/main/java/com/elearning/services/RegistrationService.java:96-117`), the five-minute expiry (`.../services/OtpService.java:11-12`), and the login gate (`.../controller/AuthController.java:330-333`) are unverified. |
| 2. Only an Admin can manage Courses, Modules, Exam Questions, Skills, and Learner accounts; a Learner can update only their own profile. | — | — | No MockMvc fixture with signed JWTs for a USER and an ADMIN. The rules live in `Backend/src/main/java/com/elearning/security/SecurityConfig.java:83-101` and in controller checks (`.../controller/AuthController.java:101-112`; `.../controller/CertificateController.java:60-70`). The frontend guards (`Frontend/src/App.js:78-85`) are not authorization. |
| 3. An Exam Attempt's Score is correct answers divided by every Exam Question in the Course. | `ExamQuestionServiceTest` (7 tests), `Backend/src/test/java/com/elearning/ExamQuestionServiceTest.java` | 48-60, 62-74, 76-88, 90-104, 106-126 | Covered. The partial-answer test at `Backend/src/test/java/com/elearning/ExamQuestionServiceTest.java:76-88` fails on the old `answers.size()` denominator. |
| 4. A Certificate requires a Score of at least 80 and is issued once per Learner per Course. | `CertificateServiceTest` (3 tests), `Backend/src/test/java/com/elearning/CertificateServiceTest.java` | 29-45, 47-55, 57-72 | Threshold and idempotency are covered. Collision handling (`Backend/src/main/java/com/elearning/services/CertificateService.java:57-60`) is not: the repository stub always returns null, so the retry loop never runs. |
| 5. A Payment becomes SUCCESS only after server-side signature verification. | `PaymentServiceTest` (3 tests), `Backend/src/test/java/com/elearning/PaymentServiceTest.java` | 53-73, 75-86, 88-94 | Valid, forged, and missing signatures are covered. The guard that rejects an unverified SUCCESS (`Backend/src/main/java/com/elearning/services/PaymentService.java:125-127`) has no test. |

**Rules tested:** 3 of 5 have direct tests. Rules 4 and 5 are only partly covered; rules 1 and 2 have no test.

**One weak test:** `PasswordSecurityTest.testBCrypt_SaltUnique` (`Backend/src/test/java/com/elearning/PasswordSecurityTest.java:27-37`) asserts that two hashes of the same password differ. That is Spring Security's behavior, not ours: the test passes even if RegistrationService stored raw passwords, because it never calls our code. The frontend test `API_BASE_URL is defined` (`Frontend/src/App.test.js:23-27`) is similarly weak — it asserts only that a string is non-empty.

**What is not tested at all:** registration → OTP → login end to end; the USER/ADMIN authorization matrix; the Payment status guard; Certificate collision retry; every React component except the API helper. The three frontend tests cover JWT header attachment and API base URL (`Frontend/src/App.test.js:8-27`); none of the five rules is a frontend rule.

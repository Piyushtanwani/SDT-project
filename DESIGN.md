# Design

The product words in this document are defined in [UBIQUITOUS_LANGUAGE.md](UBIQUITOUS_LANGUAGE.md). No new word is introduced for a concept that already has one. In every citation, `.../` abbreviates `Backend/src/main/java/com/elearning/`.

## Five rules

1. **A Learner cannot sign in before verifying their OTP.** Registration creates a disabled account, emails a six-digit OTP valid for five minutes, and only the verify-otp endpoint enables the account. Login rejects a disabled account. — `Backend/src/main/java/com/elearning/services/RegistrationService.java:58-62` and `.../services/RegistrationService.java:96-117`; `.../services/OtpService.java:11-12`; `.../controller/AuthController.java:330-333`.
2. **Only an Admin can manage Courses, Modules, Exam Questions, Skills, and Learner accounts.** Public reads are limited to Courses, Modules, Credential ID verification, and the Leaderboard. A Learner may update only their own profile, and only an Admin may change a Role. — `.../security/SecurityConfig.java:51-101`; `.../controller/AuthController.java:101-112` and `.../controller/AuthController.java:130`.
3. **An Exam Attempt's Score is correct answers divided by every Exam Question in the Course, capped at 50 questions.** Submitting fewer answers cannot raise the Score. A Score of 80 or more passes. — `.../services/ExamQuestionService.java:55-81`; `.../controller/ExamController.java:64`.
4. **A Certificate requires a Score of at least 80 and is issued once per Learner per Course.** Every Certificate gets a unique Credential ID and can be verified publicly without authentication. — `.../services/CertificateService.java:42-60`; `.../controller/CertificateController.java:47-52` and `.../controller/CertificateController.java:60-70`.
5. **A Payment becomes SUCCESS only after server-side signature verification.** An unverified caller cannot set SUCCESS, and a verified Payment cannot be downgraded. — `.../services/PaymentService.java:75-92` and `.../services/PaymentService.java:122-127`.

## Three design decisions

### 1. Deny by default at the HTTP boundary

- **Principle:** boundary. The filter chain is the edge where untrusted HTTP callers stop; controllers and services assume an authenticated, authorized caller.
- **Where:** `.../security/SecurityConfig.java:49-102`. The narrow public list is at `.../security/SecurityConfig.java:51-82`, Admin-only writes at `.../security/SecurityConfig.java:83-99`, and everything else requires authentication at `.../security/SecurityConfig.java:101`.
- **Before:** before commit `3530514`, the filter chain sent every request under `/api/exams`, `/api/questions`, `/api/skills`, `/api/auth`, `/api/certificates`, `/api/attempts`, `/api/messages`, `/payments`, `/course`, `/module`, and `/uploads` through `permitAll()`. Anonymous callers could submit Exam Attempts, issue Certificates, change Payment status, and reach account-management endpoints. The frontend already hid Admin screens (`Frontend/src/App.js:78-85`), but a hidden route is not authorization.
- **Why:** these endpoints change money, Scores, and Certificates. One explicit rule set is auditable and removes per-controller guesswork. The public surface is now limited to login, registration, OTP, GET Course and Module reads, Credential ID verification, the Leaderboard, WebSocket, and API docs.

### 2. Score calculation belongs to ExamQuestionService

- **Principle:** Single Responsibility. The service calculates the Score; ExamController only authorizes, persists the Exam Attempt, and returns it.
- **Where:** `.../services/ExamQuestionService.java:51-86`; the caller is `.../controller/ExamController.java:63-70`.
- **Before:** `evaluateExam(Map answers)` divided correct answers by `answers.size()`. One correct answer out of ten scored 100%.
- **Why:** partial submissions produced passing Exam Attempts and Certificates. Dividing by the Course's full Exam Question set (capped at 50) implements Rule 3 and can be tested without Spring; the regression test at `Backend/src/test/java/com/elearning/ExamQuestionServiceTest.java:76-88` fails on the old denominator.

### 3. Hash passwords through an injected PasswordEncoder

- **Principle:** Dependency Inversion. RegistrationService depends on the `PasswordEncoder` interface supplied by SecurityConfig; it does not construct BCrypt itself.
- **Where:** `.../services/RegistrationService.java:22-32` (constructor) and `.../services/RegistrationService.java:64-67` (encode); the bean is at `.../security/SecurityConfig.java:41-43`.
- **Before:** registration stored the raw password, and `updateUser` copied the request password onto the entity unchanged. A database leak exposed every credential.
- **Why:** every write path now goes through one encoder, so no service can persist a raw password. Legacy plaintext is upgraded at login (`.../controller/AuthController.java:338-342`), and seeded Admins are hashed or migrated (`.../config/DataInitializer.java:62` and `.../config/DataInitializer.java:72-76`). The unit tests prove BCrypt hashing and per-password salts (`Backend/src/test/java/com/elearning/PasswordSecurityTest.java:14-37`).

## One boundary: payment verification

The core stops at `PaymentService.verifySignature` (`Backend/src/main/java/com/elearning/services/PaymentService.java:94-114`). `verifyAndConfirmPayment` (`.../services/PaymentService.java:70-92`) is the only path that writes `SUCCESS`, and it writes it only after recomputing HMAC-SHA256 over `orderId|paymentId` with the server-held secret.

The boundary protects the core from two dependencies:

1. **Razorpay** — the SDK creates the order and returns a Payment ID and Payment Signature, but the core never treats that response as proof. It recomputes the signature.
2. **The browser** — `.../controller/PaymentController.java:35-47` forwards the three provider fields and contains no verification logic. `/payments/update` (`.../controller/PaymentController.java:49-55`) cannot set SUCCESS; `updatePaymentStatus` rejects it (`.../services/PaymentService.java:125-127`).

Before commit `3530514`, `updatePaymentStatus` wrote any status string, including `SUCCESS`, with no verification, so a forged callback could mark an unpaid order as paid. The Payment entity stores the Order ID in `transactionId` (`.../models/Payment.java:16`) and never stores the Payment ID; the core needs only the two IDs to recompute the signature.

## AI use

- **Tool:** Qoder (AI coding assistant) — repository review, checking the five rules against the code, and drafting and citation-checking this document set. Every `file:line` cited here was re-read against the source after drafting.
- **Rejected suggestion:** Qoder proposed moving the Passing Threshold check into `CertificateController`, next to the existing owner/Admin authorization check. Rejected: the threshold is a product rule that must hold for every caller, including future ones. It stays in `CertificateService` (`.../services/CertificateService.java:42-44`), and the controller stays responsible for authorization only.

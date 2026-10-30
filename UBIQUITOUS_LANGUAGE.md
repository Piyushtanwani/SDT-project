# Ubiquitous Language

These are the only product words used in [DESIGN.md](DESIGN.md) and [TESTING.md](TESTING.md). Code identifiers are quoted only where they differ from the product word. Generic words such as manager, handler, helper, and util are not product terms and are never used for a domain concept.

In every citation below, `.../` abbreviates `Backend/src/main/java/com/elearning/`.

## Terms

| Term | Definition | Aliases to avoid | Named in code at |
| --- | --- | --- | --- |
| Learner | A person who registers, takes Courses, and earns Certificates. | user, student, customer | `.../models/User.java:27`; `.../services/RegistrationService.java:48` |
| Admin | A Learner whose Role is `ADMIN`; manages Courses, Modules, Exam Questions, Skills, and Learner accounts. | superuser, staff, moderator | `.../models/User.java:60`; `.../security/SecurityConfig.java:96` |
| Role | The authorization level of a Learner: `USER` or `ADMIN`. | permission, group, type | `.../models/User.java:60`; `.../services/RegistrationService.java:59` |
| Course | A published learning unit with a name, description, duration, thumbnail, rating, and slug. | class, training, product, subject | `.../models/Course.java:12`; fields at `.../models/Course.java:18-23` |
| Module | An ordered section of one Course, holding text and image content. | lesson, chapter, unit, section | `.../models/Module.java:17`; order at `.../models/Module.java:24` |
| Module Number | The position of a Module inside its Course, starting from the number shown to Learners. | module index, order, position | `.../models/Module.java:24` |
| Exam Question | A four-option, single-answer question that belongs to one Course. | quiz, item, problem, question bank entry | `.../models/ExamQuestion.java:8`; correct option at `.../models/ExamQuestion.java:34` |
| Exam Attempt | One Learner's submitted answers for one Course, with a Score, pass flag, and timestamp. | result, try, submission | `.../models/ExamAttempt.java:7`; Score at `.../models/ExamAttempt.java:20`; passed at `.../models/ExamAttempt.java:23` |
| Score | The percentage of correct answers over all Exam Questions in the Course, from 0 to 100. | marks, grade, points, rating | `.../models/ExamAttempt.java:20`; `.../services/ExamQuestionService.java:81` |
| Passing Threshold | The minimum Score of 80 that makes an Exam Attempt pass and allows a Certificate. | cutoff, minimum marks, pass mark | `.../controller/ExamController.java:64`; `.../services/CertificateService.java:42` |
| Certificate | Proof that a Learner passed a Course; stores the Score, issue date, and Credential ID. | badge, diploma, award | `.../models/Certificate.java:6`; Score at `.../models/Certificate.java:19`; issue date at `.../models/Certificate.java:22` |
| Credential ID | The public unique code on a Certificate: `BC` plus eight hexadecimal characters. | certificate number, serial, verification code | `.../models/Certificate.java:24-25`; `.../services/CertificateService.java:57-60` |
| Leaderboard | The public list of Certificates ordered by Score, highest first. | ranking, scoreboard, top achievers | `.../services/CertificateService.java:27-29`; `.../controller/CertificateController.java:36-40` |
| Payment | The record of one purchase attempt, with amount, method, status, and provider identifiers. | order, transaction, invoice, receipt | `.../models/Payment.java:7`; status at `.../models/Payment.java:18` |
| Order ID | The Razorpay identifier returned when a Payment is created; stored in the legacy field `Payment.transactionId`. | transaction ID, transaction reference | `.../services/PaymentService.java:47`; stored at `.../services/PaymentService.java:54`; field at `.../models/Payment.java:16` |
| Payment Signature | The Razorpay HMAC-SHA256 over `orderId\|paymentId`, recomputed by the server before a Payment becomes `SUCCESS`. | checksum, token, hash | `.../services/PaymentService.java:94-114` |
| Connection | A directed request from one Learner to another, with a status. | friend, follow, contact | `.../models/Connection.java:9`; status at `.../models/Connection.java:22` |
| Skill | A named capability attached to a Learner; Skill names are unique. | tag, topic, technology | `.../models/Skill.java:13`; unique name at `.../models/Skill.java:19` |
| OTP | A six-digit one-time code emailed at registration, valid for five minutes, required before login. | password, PIN, verification code | `.../services/OtpService.java:11-12`; check at `.../services/RegistrationService.java:100-101` |

## Flagged ambiguities

### 1. "Exam" means both the question bank and the sitting

`ExamQuestion`, `ExamAttempt`, and the `/api/exams` route all use the short word. A request for "exam questions" and a request for "the exam result" are different objects.

**Winner:** the documents never say "exam" alone. The question is an **Exam Question**; the sitting is an **Exam Attempt**. The route name is not a product term.

### 2. "Score" and "Rating" are different numbers

`ExamAttempt.score` and `Certificate.score` are percentages from 0 to 100. `Course.rating` (`.../models/Course.java:22`) is a catalog quality rating. Calling both "score" makes an 80% exam result look comparable to a 4.5-star Course.

**Winner:** **Score** is always the exam percentage. **Rating** is always Course quality.

### 3. "Transaction ID" stores an Order ID, not a Payment ID

`Payment.transactionId` is written with the Razorpay **Order ID** before any money moves (`.../services/PaymentService.java:54`). The Razorpay **Payment ID** is passed to signature verification (`.../services/PaymentService.java:70`) and is never stored. Reading `transactionId` as "the payment" is wrong.

**Winner:** the documents say **Order ID** for the stored value. **Transaction ID** is only used when naming the legacy field, and never as a synonym for Payment ID.

### 4. "User" is the code entity; "Learner" is the person

The `User` entity (`.../models/User.java:27`) also represents Admins, so it is not a synonym for Learner. The frontend and product copy say "user" in places, but the domain distinguishes the two.

**Winner:** **Learner** for a person who takes Courses; **Admin** for one with the `ADMIN` Role. `User` is used only when naming the entity or table.

### 5. "Module" is overloaded by the codebase and the frontend

The domain `Module` is a Course section. The frontend also has `CourseModule`, `ModuleList`, and `ModuleDetail` components, and Java itself has modules. Those are code artifacts, not product concepts.

**Winner:** **Module** always means the Course section. Code components are named in full when they must be mentioned.

### 6. "Module Number" and "Module ID" are different keys

`Module.id` is the database key; `Module.moduleNumber` is the order shown inside a Course (`.../models/Module.java:24`). The frontend route uses the number, while update and delete endpoints use the ID.

**Winner:** **Module Number** for the Learner-visible order; **Module ID** only for the database key.

# Learn Without Limits

Learn Without Limits is an e-learning platform. Learners work through a Course module by module, sit a randomized exam, and earn a Certificate with a publicly verifiable Credential ID. Admins manage the catalog and the question bank. Learners can add Skills, send Connections, and chat in real time.

Built for the IT643 Software Design and Testing project.

## Live deployment

| Surface | URL |
| --- | --- |
| Web app | https://www.elearning.bitecodes.com |
| API | https://elearningbackend.bitecodes.com |
| API docs (Swagger UI) | https://elearningbackend.bitecodes.com/swagger-ui.html |

**Deployment status (checked 2026-10-28):** both hostnames return `NXDOMAIN`, so the app is not publicly reachable. Redeploy and verify these URLs before pushing the `project-final` tag.

## Team

| Name | GitHub |
| --- | --- |
| Ismail Mansuri | [@BitecodesHub](https://github.com/BitecodesHub) |
| Mohammed Afif Momin | [@Afif-Momin](https://github.com/Afif-Momin) |
| Piyush Tanwani | [@Piyushtanwani](https://github.com/Piyushtanwani) |
| Deep Soni | [@DeepSoni04](https://github.com/DeepSoni04) |

## What the product does

- **Accounts** — register with email and password, verify a 6-digit OTP (5-minute expiry), then sign in with JWT. Google sign-in is also supported.
- **Catalog** — browse Courses and their ordered Modules, each with text and image content.
- **Exams** — up to 50 random Exam Questions per Course; scoring happens on the server; every Exam Attempt is stored and can be reviewed. The Leaderboard ranks Certificates by Score, highest first.
- **Certificates** — issued only for a Score of 80 or above, one per Learner per Course, with a unique Credential ID and a public verification page and QR code.
- **Payments** — Razorpay orders with server-side HMAC-SHA256 signature verification before a Payment becomes `SUCCESS`.
- **Community** — Skills on profiles, Connections between Learners, and real-time chat over WebSocket/STOMP.
- **Practice** — an in-browser code compiler and an AI assistant page.
- **Admin** — manage Courses, Modules, Exam Questions, Skills, and Learner accounts.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, React Router 6, Tailwind CSS, axios, CodeMirror, SockJS/STOMP, jsPDF, qrcode.react |
| Backend | Java 21, Spring Boot 3.3.2, Spring Security + JJWT, Spring Data JPA, Spring WebSocket, Spring Mail |
| Data | PostgreSQL (Hibernate `ddl-auto=update` in dev) |
| Integrations | Razorpay, Cloudinary, Google OAuth, SMTP |
| API docs | springdoc OpenAPI (Swagger UI) |
| Tests | JUnit 5, Mockito, Spring Security Test, H2 (test scope), Jest |

## Run locally

Prerequisites: Java 21, Node 18+, and Docker (for PostgreSQL).

```bash
git clone https://github.com/Piyushtanwani/SDT-project.git && cd SDT-project
docker run -d --name elearning-db -e POSTGRES_DB=elearning -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
cd Backend && DB_URL=jdbc:postgresql://localhost:5432/elearning DB_USERNAME=postgres DB_PASSWORD=postgres ./mvnw spring-boot:run
cd Frontend && cp .env.example .env && npm install
npm start
```

Run command 3 in one terminal; it keeps running. Run commands 4 and 5 in a second terminal, from the repository root.

The web app is at http://localhost:3000 and the API at http://localhost:8080. Swagger UI is at http://localhost:8080/swagger-ui.html.

The `dev` profile has fallback values for SMTP, Razorpay, Cloudinary, and JWT. Provide your own environment variables before using real integrations.

## Tests

```bash
cd Backend && ./mvnw test
cd Frontend && CI=true npm test
```

The backend suite is 15 tests across four classes (`CertificateServiceTest`, `ExamQuestionServiceTest`, `PasswordSecurityTest`, `PaymentServiceTest`); all pass. The frontend suite is 3 tests in `App.test.js`.

## Design documents

- [UBIQUITOUS_LANGUAGE.md](UBIQUITOUS_LANGUAGE.md) — product terms and flagged ambiguities
- [DESIGN.md](DESIGN.md) — five rules, three design decisions, one boundary, AI use
- [TESTING.md](TESTING.md) — which rules are tested and which are not

## Repository layout

```
Backend/    Spring Boot API (controllers, services, repositories, models, security)
Frontend/   React single-page app (components, context, config)
```

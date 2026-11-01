package com.elearning.services;

import com.elearning.models.ExamAttempt;
import com.elearning.models.ExamQuestion;
import com.elearning.repositories.ExamAttemptRepository;
import com.elearning.security.JwtService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Owns an attempt from the moment Start is pressed to the moment a score exists.
 *
 * The row is the authority: it holds the deadline, the exact questions served, each question's
 * per-attempt letter order and the answer sheet as it was saved. Nothing the browser sends is
 * trusted for time, question set or score, which is what makes the proctoring signals worth having
 * in the first place — a candidate cannot argue with a clock they never held.
 */
@Service
public class ExamSessionService {

    private static final Logger log = LoggerFactory.getLogger(ExamSessionService.class);

    private static final TypeReference<Map<Long, String>> ANSWER_MAP = new TypeReference<>() {
    };

    /**
     * Fragments a real browser never puts in its own user agent.
     *
     * Anything matching here is a script or a headless engine talking to the exam endpoint, which is
     * a fact worth writing down before the candidate answers a single question.
     */
    private static final List<String> NON_BROWSER_MARKERS = List.of(
            "headlesschrome", "phantomjs", "puppeteer", "playwright", "selenium", "webdriver",
            "curl/", "wget/", "okhttp/", "python-requests", "python-urllib", "go-http-client",
            "java/", "httpclient", "node-fetch", "axios/", "libwww");

    /** One letter answered this often means the sheet was filled, not read. */
    private static final int SINGLE_LETTER_MIN_ANSWERS = 8;
    private static final int SINGLE_LETTER_SHARE_PERCENT = 80;

    private final ExamAttemptRepository attemptRepository;
    private final ExamDrawService examDrawService;
    private final ExamProctorService proctorService;
    private final JwtService jwtService;
    private final ExamPolicy policy;
    private final ObjectMapper objectMapper;

    public ExamSessionService(ExamAttemptRepository attemptRepository,
                              ExamDrawService examDrawService,
                              ExamProctorService proctorService,
                              JwtService jwtService,
                              ExamPolicy policy,
                              ObjectMapper objectMapper) {
        this.attemptRepository = attemptRepository;
        this.examDrawService = examDrawService;
        this.proctorService = proctorService;
        this.jwtService = jwtService;
        this.policy = policy;
        this.objectMapper = objectMapper;
    }

    /** An open sitting, with the questions as this candidate must see them. */
    public record OpenSitting(ExamAttempt attempt, List<ExamQuestion> questions, String drawToken) {
    }

    /** How many sittings are left and, when none are, when the next one unlocks. */
    public record Standing(int attemptsUsed, int attemptsRemaining, LocalDateTime nextAllowedAt) {
    }

    @Transactional
    public OpenSitting start(Long userId, Long courseId, String userAgent) {
        return start(userId, courseId, userAgent, null);
    }

    /**
     * Pressing Start.
     *
     * @param clientIp the address the request reached us from, which the reviewer gets as context;
     *                 nobody is accused of anything by it, because households share one address
     * @return the existing open sitting if one is already running, so a refresh or a second tab
     *         resumes the same exam with the same clock instead of banking a second attempt
     */
    @Transactional
    public OpenSitting start(Long userId, Long courseId, String userAgent, String clientIp) {
        Optional<ExamAttempt> open = attemptRepository
                .findFirstByUserIdAndCourseIdAndStatusOrderByStartedAtDesc(userId, courseId, ExamAttempt.STATUS_IN_PROGRESS);
        if (open.isPresent()) {
            ExamAttempt existing = open.get();
            if (existing.getDeadline() == null
                    || LocalDateTime.now().isBefore(existing.getDeadline().plus(policy.submitGrace()))) {
                return new OpenSitting(existing, servedQuestions(existing), rotateDrawToken(existing));
            }
            closeExpired(existing);
        }

        Standing standing = standing(userId, courseId);
        if (standing.attemptsRemaining() <= 0) {
            throw new ExamRuleException(ExamRuleException.Kind.POLICY, waitingMessage(standing));
        }

        ExamDrawService.QuestionSet draw = examDrawService.draw(courseId, ExamPolicy.QUESTIONS_PER_EXAM);
        if (draw.questions().isEmpty()) {
            throw new ExamRuleException(ExamRuleException.Kind.NOT_FOUND,
                    "This course has no exam questions yet, so there is nothing to attempt.");
        }

        LocalDateTime now = LocalDateTime.now();
        ExamAttempt attempt = new ExamAttempt();
        attempt.setUserId(userId);
        attempt.setCourseId(courseId);
        attempt.setStatus(ExamAttempt.STATUS_IN_PROGRESS);
        attempt.setAttemptedAt(now);
        attempt.setStartedAt(now);
        attempt.setDeadline(now.plus(policy.duration()));
        attempt.setAttemptNumber((int) attemptRepository.countSittings(userId, courseId,
                ExamAttemptRepository.COUNTED_STATUSES) + 1);
        attempt.setTotalQuestions(draw.questions().size());
        attempt.setQuestionIds(draw.questions().stream().map(q -> String.valueOf(q.getId()))
                .collect(Collectors.joining(",")));
        attempt.setOptionOrders(writeOrders(draw.optionOrders()));
        attempt.setUserAgent(truncate(userAgent, 512));
        attempt.setClientIp(truncate(clientIp, 64));
        attempt.setIntegrity(ExamAttempt.INTEGRITY_CLEAN);
        ExamAttempt saved = attemptRepository.save(attempt);

        noteTrafficThatIsNotABrowser(saved, userAgent);
        noteSharedNetworkAddress(saved, userId);
        attemptRepository.save(saved);

        List<Long> ids = draw.questions().stream().map(ExamQuestion::getId).toList();
        String token = jwtService.generateExamDrawToken(userId, courseId, saved.getId(), ids,
                policy.drawValidity().toMillis());
        saved.setDrawTokenId(tokenIdOf(token));
        return new OpenSitting(attemptRepository.save(saved), draw.questions(), token);
    }

    /**
     * A sitting opened by something that identifies itself as not a browser.
     *
     * Real learners arrive with a browser's user agent. A script announces itself as curl, Python or
     * a headless Chrome, and that is worth a line in the record on its own, not only as a change.
     */
    private void noteTrafficThatIsNotABrowser(ExamAttempt attempt, String userAgent) {
        if (userAgent == null) {
            return;
        }
        String lower = userAgent.toLowerCase(Locale.ROOT);
        for (String marker : NON_BROWSER_MARKERS) {
            if (lower.contains(marker)) {
                proctorService.recordServer(attempt, ProctorSignal.HEADLESS_BROWSER,
                        "The request identified itself as \"" + truncate(userAgent, 180) + "\".");
                return;
            }
        }
    }

    /** Records the address itself, not an accusation: households and offices share one. */
    private void noteSharedNetworkAddress(ExamAttempt attempt, Long userId) {
        if (attempt.getClientIp() == null) {
            return;
        }
        List<ExamAttempt> others = attemptRepository
                .findTop5ByClientIpAndUserIdNotOrderByIdDesc(attempt.getClientIp(), userId);
        if (others.isEmpty()) {
            return;
        }
        proctorService.recordServer(attempt, ProctorSignal.SHARED_NETWORK_ADDRESS,
                others.size() + " other attempt(s) on this exam were reached from the same address ("
                        + attempt.getClientIp() + ").");
    }

    /**
     * A candidate's own open or finished sitting, by id, only if it is theirs.
     *
     * @throws ExamRuleException NOT_FOUND when it does not exist and DENIED when it belongs to
     *                           someone else — the caller must not learn which of the two it was.
     */
    public ExamAttempt ownedAttempt(Long attemptId, Long userId) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ExamRuleException(ExamRuleException.Kind.NOT_FOUND,
                        "That exam attempt no longer exists."));
        if (!attempt.getUserId().equals(userId)) {
            throw new ExamRuleException(ExamRuleException.Kind.DENIED,
                    "That exam attempt belongs to another account.");
        }
        return attempt;
    }

    public Standing standing(Long userId, Long courseId) {
        long used = attemptRepository.countSittings(userId, courseId, ExamAttemptRepository.COUNTED_STATUSES);
        int remaining = (int) Math.max(0, policy.maxAttempts() - used);
        LocalDateTime nextAllowedAt = null;
        if (remaining <= 0) {
            List<ExamAttempt> sittings = attemptRepository.findSittingsNewestFirst(
                    userId, courseId, ExamAttemptRepository.COUNTED_STATUSES);
            if (!sittings.isEmpty()) {
                ExamAttempt latest = sittings.get(0);
                LocalDateTime from = latest.getSubmittedAt() != null ? latest.getSubmittedAt() : latest.getAttemptedAt();
                nextAllowedAt = from.plus(policy.cooldown());
                if (nextAllowedAt.isBefore(LocalDateTime.now())) {
                    remaining = 1;
                    nextAllowedAt = null;
                }
            } else {
                remaining = 1;
            }
        }
        return new Standing((int) used, remaining, nextAllowedAt);
    }

    /** Every autosave while the clock runs, so a crash, a closed tab or a power cut costs minutes, not the exam. */
    @Transactional
    public void autosave(Long attemptId, Long userId, Map<Long, String> answers) {
        ExamAttempt attempt = ownedAttempt(attemptId, userId);
        if (!attempt.isOpen()) {
            throw new ExamRuleException(ExamRuleException.Kind.STALE, "This exam attempt is already closed.");
        }
        attempt.setAnswers(writeAnswers(answers));
        attemptRepository.save(attempt);
    }

    /**
     * Handing the paper in.
     *
     * The signed draw token must match the attempt it was minted for, the server clock decides
     * whether the submit is on time, and the score is computed here from the stored question set —
     * never from anything the sender asserts.
     */
    @Transactional
    public ExamAttempt submit(Long attemptId, Long userId, String drawToken, Map<Long, String> answers) {
        ExamAttempt attempt = ownedAttempt(attemptId, userId);
        if (ExamAttempt.STATUS_SUBMITTED.equals(attempt.getStatus())
                || ExamAttempt.STATUS_EXPIRED.equals(attempt.getStatus())) {
            return attempt; // A double press must not create a second result or a second attempt.
        }
        if (ExamAttempt.STATUS_VOIDED.equals(attempt.getStatus())) {
            throw new ExamRuleException(ExamRuleException.Kind.STALE, "This exam attempt was voided by a reviewer.");
        }
        if (drawToken == null || !matchesDraw(attempt, drawToken)) {
            proctorService.recordServer(attempt, ProctorSignal.TOKEN_REPLAY, null);
            attemptRepository.save(attempt);
            throw new ExamRuleException(ExamRuleException.Kind.STALE,
                    "This exam's question set is no longer valid. Start a new attempt to load a fresh set.");
        }

        LocalDateTime now = LocalDateTime.now();
        Map<Long, String> sheet = answers == null || answers.isEmpty() ? readAnswers(attempt.getAnswers()) : answers;

        if (attempt.getStartedAt() != null) {
            long elapsed = Duration.between(attempt.getStartedAt(), now).getSeconds();
            if (elapsed < policy.minDurationSeconds()) {
                // Handing in early is the candidate's call, not ours to refuse: the paper is graded
                // and the record says how little work was in it, which is what a reviewer reads.
                proctorService.recordServer(attempt, ProctorSignal.TOO_FAST_SUBMIT,
                        "Submitted after " + elapsed + "s; " + policy.minDurationSeconds() + "s is the minimum.");
                attempt.setIntegrity(ExamAttempt.INTEGRITY_FLAGGED);
            }
        }

        if (attempt.getDeadline() != null && now.isAfter(attempt.getDeadline().plus(policy.submitGrace()))) {
            // Past the grace window the browser's answer sheet is not believed: only what the
            // server already holds is graded, and the attempt is marked for review.
            proctorService.recordServer(attempt, ProctorSignal.LATE_SUBMIT,
                    "Submitted " + Duration.between(attempt.getDeadline(), now).toSeconds() + "s past the deadline.");
            return closeExpired(attempt);
        }

        return gradeAndClose(attempt, sheet, ExamAttempt.STATUS_SUBMITTED, now);
    }

    public List<ExamQuestion> servedQuestions(ExamAttempt attempt) {
        return examDrawService.render(readIds(attempt.getQuestionIds()), readOrders(attempt.getOptionOrders()));
    }

    /**
     * Grades an attempt and writes the result onto it.
     *
     * @param status SUBMITTED for a normal hand-in, EXPIRED when time ran out first
     */
    private ExamAttempt gradeAndClose(ExamAttempt attempt, Map<Long, String> sheet, String status, LocalDateTime now) {
        noteSheetThatDidNotNeedReading(attempt, sheet, now);
        ExamDrawService.GradeResult grade = examDrawService.grade(
                readIds(attempt.getQuestionIds()), readOrders(attempt.getOptionOrders()), sheet);
        double score = Math.round(Math.max(0.0, Math.min(100.0, grade.score())));
        attempt.setScore(score);
        attempt.setCorrectCount(grade.correct());
        attempt.setTotalQuestions(grade.total());
        attempt.setPassed(score >= CertificateService.PASSING_SCORE);
        attempt.setStatus(status);
        attempt.setSubmittedAt(now);
        attempt.setAnswers(writeAnswers(sheet));
        attempt.setIntegrity(ExamAttempt.INTEGRITY_FLAGGED.equals(attempt.getIntegrity())
                ? ExamAttempt.INTEGRITY_FLAGGED
                : policy.verdictFor(attempt.getViolationPoints()));
        return attemptRepository.save(attempt);
    }

    /**
     * Writes down what the shape of a sheet says about how it was made.
     *
     * Both of these are arithmetic over what the server already holds — the clock it owns and the
     * answers it was sent — so neither can be talked out of existing by a candidate's own page.
     */
    private void noteSheetThatDidNotNeedReading(ExamAttempt attempt, Map<Long, String> sheet, LocalDateTime now) {
        int answered = sheet.size();
        if (answered == 0 || attempt.getStartedAt() == null) {
            return;
        }
        long elapsed = Math.max(0, Duration.between(attempt.getStartedAt(), now).getSeconds());
        int readable = answered * policy.minSecondsPerQuestion();
        if (answered >= 5 && elapsed < readable) {
            proctorService.recordServer(attempt, ProctorSignal.ANSWERED_FASTER_THAN_READING,
                    answered + " questions in " + elapsed + "s; reading them alone takes about " + readable + "s.");
        }
        Map<String, Integer> byLetter = new LinkedHashMap<>();
        for (String letter : sheet.values()) {
            if (letter != null) {
                byLetter.merge(letter.trim().toUpperCase(Locale.ROOT), 1, Integer::sum);
            }
        }
        int best = byLetter.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        if (answered >= SINGLE_LETTER_MIN_ANSWERS && best * 100 >= answered * SINGLE_LETTER_SHARE_PERCENT) {
            proctorService.recordServer(attempt, ProctorSignal.SINGLE_LETTER_PATTERN,
                    best + " of " + answered + " answers were the same letter.");
        }
    }

    /**
     * Stops a sitting that has spent too much of its life outside full screen.
     *
     * The paper is covered while full screen is lost, so a long stretch means the candidate kept
     * working somewhere the questions could be read by anyone else in the room. The attempt is
     * graded from what we hold and closed, because a sitting that cannot be watched cannot be passed.
     */
    @Transactional
    public ExamAttempt closeFullscreenBreach(ExamAttempt attempt) {
        if (!attempt.isOpen()) {
            return attempt;
        }
        attempt.setIntegrity(ExamAttempt.INTEGRITY_FLAGGED);
        return gradeAndClose(attempt, readAnswers(attempt.getAnswers()), ExamAttempt.STATUS_SUBMITTED,
                LocalDateTime.now());
    }

    private ExamAttempt closeExpired(ExamAttempt attempt) {
        proctorService.recordServer(attempt, ProctorSignal.TIME_EXHAUSTED, null);
        return gradeAndClose(attempt, readAnswers(attempt.getAnswers()), ExamAttempt.STATUS_EXPIRED, LocalDateTime.now());
    }

    /**
     * Closes open sittings whose clock has run out while nobody was watching — a candidate who
     * simply closes the tab still has a graded attempt rather than one stuck in progress forever.
     */
    @Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
    @Transactional
    public void sweepExpiredSittings() {
        LocalDateTime cutoff = LocalDateTime.now().minus(policy.submitGrace());
        List<ExamAttempt> overdue = attemptRepository.findByStatusAndDeadlineBefore(
                ExamAttempt.STATUS_IN_PROGRESS, cutoff);
        for (ExamAttempt attempt : overdue) {
            try {
                closeExpired(attempt);
            } catch (RuntimeException e) {
                log.warn("Could not close expired exam attempt {}: {}", attempt.getId(), e.getMessage());
            }
        }
        // A page that went offline while covered never gets to close itself, so the sitting that has
        // already spent its full-screen allowance is stopped here rather than watched by nobody.
        List<ExamAttempt> breached = attemptRepository.findByStatusAndFullscreenBlockedSecondsGreaterThanEqual(
                ExamAttempt.STATUS_IN_PROGRESS, policy.maxFullscreenBlockSeconds());
        for (ExamAttempt attempt : breached) {
            try {
                closeFullscreenBreach(attempt);
            } catch (RuntimeException e) {
                log.warn("Could not close full-screen breach on exam attempt {}: {}", attempt.getId(), e.getMessage());
            }
        }
    }

    private boolean matchesDraw(ExamAttempt attempt, String drawToken) {
        try {
            JwtService.ExamDrawClaims claims = jwtService.parseExamDrawToken(drawToken);
            return claims.attemptId().equals(attempt.getId())
                    && claims.userId().equals(attempt.getUserId())
                    && claims.courseId().equals(attempt.getCourseId())
                    && attempt.getDrawTokenId() != null
                    && attempt.getDrawTokenId().equals(claims.tokenId());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private String tokenIdOf(String drawToken) {
        try {
            return jwtService.parseExamDrawToken(drawToken).tokenId();
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("A draw token this server just signed failed to parse.", e);
        }
    }

    /**
     * Re-signs the question set of a sitting that is still running, so a refreshed page can hand in.
     *
     * The row keeps only the newest id, which means the token the previous page held stops working
     * the moment a resume happens: a second tab that was left open cannot submit after the one that
     * reloaded, and cannot use either token to be served a different set.
     */
    private String rotateDrawToken(ExamAttempt attempt) {
        String token = jwtService.generateExamDrawToken(attempt.getUserId(), attempt.getCourseId(),
                attempt.getId(), readIds(attempt.getQuestionIds()), policy.drawValidity().toMillis());
        attempt.setDrawTokenId(tokenIdOf(token));
        attemptRepository.save(attempt);
        return token;
    }

    private String waitingMessage(Standing standing) {
        if (standing.nextAllowedAt == null) {
            return "You have used all " + policy.maxAttempts() + " attempts for this exam.";
        }
        return "You have used all " + policy.maxAttempts() + " attempts for this exam. The next one opens after "
                + standing.nextAllowedAt.toLocalTime() + " on " + standing.nextAllowedAt.toLocalDate() + ".";
    }

    private String writeOrders(Map<Long, String> orders) {
        try {
            return objectMapper.writeValueAsString(orders);
        } catch (Exception e) {
            throw new IllegalStateException("Could not store the option order for an exam draw.", e);
        }
    }

    private Map<Long, String> readOrders(String json) {
        return readMap(json);
    }

    private String writeAnswers(Map<Long, String> answers) {
        try {
            return objectMapper.writeValueAsString(answers == null ? Map.of() : answers);
        } catch (Exception e) {
            throw new IllegalStateException("Could not store an exam answer sheet.", e);
        }
    }

    private Map<Long, String> readAnswers(String json) {
        Map<Long, String> answers = readMap(json);
        return answers == null ? Map.of() : answers;
    }

    private Map<Long, String> readMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            Map<Long, String> parsed = objectMapper.readValue(json, ANSWER_MAP);
            return parsed == null ? Map.of() : new LinkedHashMap<>(parsed);
        } catch (Exception e) {
            log.warn("Ignoring unreadable exam JSON ({} characters).", json.length());
            return Map.of();
        }
    }

    private List<Long> readIds(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        List<Long> ids = new ArrayList<>();
        for (String part : Arrays.stream(csv.split(",")).toList()) {
            try {
                ids.add(Long.parseLong(part.trim()));
            } catch (NumberFormatException ignored) {
                // A malformed id cannot be graded; the rest of the set still can be.
            }
        }
        return ids;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.length() <= max ? cleaned : cleaned.substring(0, max);
    }
}

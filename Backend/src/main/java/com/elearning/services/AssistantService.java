package com.elearning.services;

import com.elearning.models.Certificate;
import com.elearning.models.Course;
import com.elearning.models.Module;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ModuleRepository;
import com.elearning.response_request.UserCertificateDTO;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Deterministic study assistant. It answers from the local database and a
 * curated knowledge base, so it keeps working when external AI is unreachable.
 */
@Service
public class AssistantService {

    public static final String SOURCE = "offline";

    private static final int MAX_INPUT_LENGTH = 1000;
    private static final Pattern CREDENTIAL_PATTERN =
            Pattern.compile("\\bBC[0-9A-F]{8}\\b", Pattern.CASE_INSENSITIVE);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy");

    private static final Set<String> STOPWORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does", "for", "from",
            "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "please", "tell", "that",
            "the", "this", "to", "was", "what", "when", "where", "which", "who", "why", "with", "you"
    );

    private static final List<Article> KNOWLEDGE_BASE = buildKnowledgeBase();

    private final CourseRepository courseRepository;
    private final ModuleRepository moduleRepository;
    private final CertificateRepository certificateRepository;

    public AssistantService(CourseRepository courseRepository,
                            ModuleRepository moduleRepository,
                            CertificateRepository certificateRepository) {
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.certificateRepository = certificateRepository;
    }

    public String answer(String rawMessage) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return help();
        }
        String message = rawMessage.strip();
        if (message.length() > MAX_INPUT_LENGTH) {
            message = message.substring(0, MAX_INPUT_LENGTH);
        }
        String normalized = normalize(message);
        List<String> words = Arrays.stream(normalized.split(" ")).filter(w -> !w.isBlank()).toList();

        try {
            Matcher credential = CREDENTIAL_PATTERN.matcher(message);
            if (credential.find()) {
                return verifyCredential(credential.group().toUpperCase(Locale.ROOT));
            }
            if (words.stream().anyMatch(w -> Set.of("hi", "hello", "hey", "namaste", "greetings").contains(w))) {
                return greeting();
            }
            if (hasPhrase(normalized, "help", "menu", "what can you do", "commands", "options")) {
                return help();
            }
            if (hasPhrase(normalized, "exam rules", "exam rule", "rules", "how long", "time limit",
                    "exam format", "how many questions", "unanswered")) {
                return examRules();
            }
            if (hasPhrase(normalized, "passing score", "pass mark", "passing mark", "pass percentage",
                    "how much to pass", "80", "minimum score")) {
                return passingScore();
            }
            if (hasPhrase(normalized, "certificate", "certification", "credential")) {
                return certificateHelp();
            }
            if (hasPhrase(normalized, "leaderboard", "leader board", "ranking", "top learners", "top students")) {
                return leaderboard();
            }
            if (hasPhrase(normalized, "fee", "fees", "price", "cost", "payment", "razorpay", "pay")) {
                return fees();
            }
            if (hasPhrase(normalized, "course", "courses", "catalog", "catalogue", "curriculum", "syllabus",
                    "what can i learn", "available classes")) {
                return courseList();
            }
            if (hasPhrase(normalized, "register", "sign up", "signup", "login", "log in", "otp",
                    "password", "account", "create account")) {
                return accountHelp();
            }
            if (hasPhrase(normalized, "contact", "support", "human", "email", "reach you", "help desk")) {
                return contact();
            }

            String article = matchArticle(normalized);
            if (article != null) {
                return article;
            }
            String moduleMatch = matchModule(normalized, words);
            if (moduleMatch != null) {
                return moduleMatch;
            }
            return fallback();
        } catch (RuntimeException e) {
            return "I could not look that up just now. Please try a shorter question, for example "
                    + "\"exam rules\", \"list courses\" or \"what is a hash table\".";
        }
    }

    private String greeting() {
        return "Hello! I am the SDT Learning Assistant. I can help with courses, exam rules, "
                + "passing scores, certificates, the leaderboard and technical topics.\n\n"
                + "Try: \"list courses\" or \"explain SQL joins\".\n\n"
                + "I run entirely on this server, so I keep working even when external AI services are offline.";
    }

    private String help() {
        return "SDT Learning Assistant (offline mode)\n\n"
                + "Ask me about:\n"
                + "1. Courses — \"list courses\"\n"
                + "2. Exams — \"exam rules\", \"passing score\"\n"
                + "3. Certificates — \"verify BC2408F87C\"\n"
                + "4. Leaderboard — \"top learners\"\n"
                + "5. Payments — \"certificate fee\"\n"
                + "6. Accounts — \"how do I register\"\n"
                + "7. Technical topics — e.g. \"what is a hash table\", \"SQL joins\", \"deadlock\"\n\n"
                + "This assistant is deterministic and self-hosted, so it remains available without any external AI service.";
    }

    private String courseList() {
        List<Course> courses = courseRepository.findAll().stream()
                .sorted(Comparator.comparing(Course::getId))
                .toList();
        if (courses.isEmpty()) {
            return "No courses have been published yet. Please check back shortly, or contact "
                    + "bitecodes.global@gmail.com for the current schedule.";
        }
        StringBuilder sb = new StringBuilder("Available courses (" + courses.size() + "):\n");
        int index = 1;
        for (Course course : courses) {
            sb.append(index++).append(". ").append(safe(course.getName()));
            List<String> details = new ArrayList<>();
            if (course.getDuration() != null && !course.getDuration().isBlank()) {
                details.add(course.getDuration());
            }
            if (course.getRating() != null && course.getRating() > 0) {
                details.add(String.format(Locale.ROOT, "%.1f stars", course.getRating()));
            }
            if (!details.isEmpty()) {
                sb.append(" — ").append(String.join(" · ", details));
            }
            sb.append('\n');
        }
        sb.append("\nOpen a course page to read its modules, then take the exam. ")
                .append("A score of 80% or higher unlocks the certificate.");
        return sb.toString();
    }

    private String examRules() {
        return "Exam rules\n"
                + "• Each exam draws a random set of questions from the course bank (up to 50).\n"
                + "• The timer is 40 minutes; the attempt auto-submits when time runs out.\n"
                + "• Unanswered questions are recorded as option E and count as incorrect.\n"
                + "• Questions are multiple choice (A–D); each has exactly one correct answer.\n"
                + "• A score of 80% or higher is required to pass.\n"
                + "• You can review your score on the result page immediately after submitting.";
    }

    private String passingScore() {
        return "Passing score: 80%.\n"
                + "Your attempt is graded on the server against the full question set, and the result is "
                + "rounded to the nearest whole percent. A score of 80 or above marks the attempt as passed "
                + "and makes you eligible for a certificate for that course.";
    }

    private String certificateHelp() {
        return "Certificates\n"
                + "• Pass a course exam with at least 80% to become eligible.\n"
                + "• Request the certificate from the course result page; the server re-checks your best "
                + "recorded attempt before issuing it.\n"
                + "• Each certificate carries a unique credential ID in the form BC######## (for example "
                + "BC2408F87C).\n"
                + "• Anyone can verify a credential on the site. To check one here, send the ID, "
                + "e.g. \"verify BC2408F87C\".";
    }

    private String verifyCredential(String credentialId) {
        Certificate certificate = certificateRepository.getByCredentialId(credentialId);
        if (certificate == null) {
            return "No certificate found for credential " + credentialId + ".\n"
                    + "Check the ID for typos, or verify it on the certificate page. "
                    + "Credential IDs look like BC2408F87C.";
        }
        String courseName = courseRepository.findById(certificate.getCourseId())
                .map(Course::getName)
                .orElse("Course #" + certificate.getCourseId());
        String issued = certificate.getIssuedAt() == null
                ? "an unknown date"
                : DATE_FORMAT.format(certificate.getIssuedAt());
        return "Certificate " + credentialId + " is valid.\n"
                + "• Course: " + courseName + "\n"
                + "• Score: " + Math.round(certificate.getScore()) + "%\n"
                + "• Issued: " + issued;
    }

    private String leaderboard() {
        List<UserCertificateDTO> top = certificateRepository.findTopAchievers().stream()
                .limit(5)
                .toList();
        if (top.isEmpty()) {
            return "The leaderboard is empty right now. Pass a course exam with 80% or higher to become "
                    + "the first entry.";
        }
        StringBuilder sb = new StringBuilder("Top learners by certificate score:\n");
        int rank = 1;
        for (UserCertificateDTO entry : top) {
            sb.append(rank++).append(". ").append(safe(entry.getUserName()))
                    .append(" — ").append(safe(entry.getCourseName()))
                    .append(" (").append(Math.round(entry.getScore())).append("%)\n");
        }
        return sb.toString().strip();
    }

    private String fees() {
        return "Certificate fee: ₹50 (INR), payable once per certificate through Razorpay.\n"
                + "Steps: pass the exam with 80% or higher, open the certificate section on the result page, "
                + "then complete the payment. Certificates already issued are kept in your profile.\n"
                + "If online payments are unavailable on this deployment, contact "
                + "bitecodes.global@gmail.com and support will issue the certificate manually.";
    }

    private String accountHelp() {
        return "Account help\n"
                + "• Register with your name, email and password from the Sign Up page.\n"
                + "• A one-time passcode (OTP) is sent to your email; enter it to activate the account. "
                + "On development servers the OTP is also written to the backend log when email is not configured.\n"
                + "• Log in with your email and password. Sessions use a signed token; sign out if you are on a shared device.\n"
                + "• If an email does not arrive, check spam, then use \"Resend OTP\".";
    }

    private String contact() {
        return "Support\n"
                + "• Email: bitecodes.global@gmail.com\n"
                + "• Response time: usually within one business day.\n"
                + "• For certificate problems, include the credential ID and the course name.";
    }

    private String fallback() {
        return "I did not find a specific answer for that yet.\n\n"
                + "I can help with:\n"
                + "• \"list courses\" — full catalog\n"
                + "• \"exam rules\" — duration, format and scoring\n"
                + "• \"passing score\" — certificate requirements\n"
                + "• \"verify BC########\" — credential lookup\n"
                + "• \"top learners\" — leaderboard\n"
                + "• \"certificate fee\" — payment details\n"
                + "• Technical topics such as \"SQL joins\", \"hash table\", \"deadlock\" or \"JWT\".\n\n"
                + "Try rephrasing with one of those keywords.";
    }

    private String matchArticle(String normalized) {
        Article best = null;
        int bestScore = 0;
        for (Article article : KNOWLEDGE_BASE) {
            int score = 0;
            for (String keyword : article.keywords()) {
                if (normalized.contains(keyword)) {
                    score++;
                }
            }
            if (score > bestScore) {
                best = article;
                bestScore = score;
            }
        }
        return best == null || bestScore == 0 ? null : best.body();
    }

    private String matchModule(String normalized, List<String> words) {
        List<String> keywords = words.stream()
                .filter(word -> word.length() >= 3 && !STOPWORDS.contains(word))
                .distinct()
                .toList();
        if (keywords.isEmpty()) {
            return null;
        }
        Map<Long, String> courseNames = courseRepository.findAll().stream()
                .collect(Collectors.toMap(Course::getId, Course::getName, (a, b) -> a));

        Module best = null;
        String bestSnippet = null;
        int bestScore = 0;
        for (Module module : moduleRepository.findAll()) {
            String corpus = normalize(safe(module.getModuleTitle()) + " "
                    + (module.getContent() == null ? "" : String.join(" ", module.getContent())));
            int score = 0;
            for (String keyword : keywords) {
                if (corpus.contains(keyword)) {
                    score++;
                }
            }
            if (score > bestScore) {
                best = module;
                bestScore = score;
                bestSnippet = snippetFor(module, keywords);
            }
        }
        if (best == null) {
            return null;
        }
        String courseName = courseNames.getOrDefault(best.getCourseId(), "Course #" + best.getCourseId());
        return "From the course \"" + courseName + "\" — module \"" + safe(best.getModuleTitle()) + "\":\n\n"
                + bestSnippet + "\n\n"
                + "Open the course page to read the full module, or ask another question.";
    }

    private String snippetFor(Module module, List<String> keywords) {
        List<String> paragraphs = module.getContent() == null ? List.of() : module.getContent();
        for (String paragraph : paragraphs) {
            String normalized = normalize(paragraph);
            if (keywords.stream().anyMatch(normalized::contains)) {
                return paragraph.length() > 500 ? paragraph.substring(0, 497).strip() + "..." : paragraph;
            }
        }
        if (paragraphs.isEmpty()) {
            return safe(module.getModuleTitle());
        }
        String first = paragraphs.get(0);
        return first.length() > 500 ? first.substring(0, 497).strip() + "..." : first;
    }

    private static boolean hasPhrase(String normalized, String... phrases) {
        for (String phrase : phrases) {
            String candidate = normalize(phrase);
            if (candidate.isEmpty()) {
                continue;
            }
            if (candidate.contains(" ")) {
                if (normalized.contains(candidate)) {
                    return true;
                }
            } else if (Arrays.asList(normalized.split(" ")).contains(candidate)) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(String text) {
        return text == null ? "" : text.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .strip()
                .replaceAll("\\s+", " ");
    }

    private static String safe(String value) {
        return value == null || value.isBlank() ? "Untitled" : value.strip();
    }

    private record Article(List<String> keywords, String body) {
    }

    private static List<Article> buildKnowledgeBase() {
        Map<String, Article> articles = new LinkedHashMap<>();
        add(articles, "object-oriented programming",
                List.of("oop", "object oriented", "object-oriented", "encapsulation", "inheritance",
                        "polymorphism", "abstraction", "class and object"),
                "Object-oriented programming organises software around objects that combine state and behaviour.\n"
                        + "• Encapsulation hides internal state behind methods.\n"
                        + "• Inheritance reuses behaviour from a parent type; prefer composition when the "
                        + "relationship is not truly \"is-a\".\n"
                        + "• Polymorphism lets one interface serve several implementations.\n"
                        + "• Abstraction exposes what a type does, not how.\n"
                        + "Design by the SOLID principles to keep hierarchies small and dependencies stable.");
        add(articles, "java",
                List.of("java", "jvm", "bytecode", "spring boot", "garbage collection"),
                "Java compiles to platform-independent bytecode that runs on the JVM. Memory is managed by "
                        + "a generational garbage collector, so developers focus on object lifetimes rather than "
                        + "manual frees. The language is statically typed, supports interfaces, generics and records, "
                        + "and its ecosystem includes Spring Boot for production services. Common interview topics "
                        + "are the JVM memory model, collections, exceptions, concurrency and the difference between "
                        + "checked and unchecked exceptions.");
        add(articles, "python",
                List.of("python", "django", "flask", "pandas", "list comprehension", "generator"),
                "Python is a dynamically typed, interpreted language known for readable syntax. Lists, tuples, "
                        + "dictionaries and sets cover most everyday data structures, and comprehensions build them "
                        + "concisely. Generators and iterators keep memory flat for large data. The GIL means CPU-bound "
                        + "threads do not run in parallel, so multiprocessing or native extensions are used for that; "
                        + "asyncio is better suited to I/O-bound concurrency.");
        add(articles, "sql",
                List.of("sql", "select", "query language", "group by", "where clause"),
                "SQL is a declarative language: you describe the result you want and the database planner chooses "
                        + "how to execute it. Core clauses are SELECT, FROM, WHERE, GROUP BY, HAVING and ORDER BY. "
                        + "Use joins to combine tables, aggregate functions for summaries, and subqueries or CTEs for "
                        + "readability. Always parameterise queries — string concatenation is the classic SQL injection risk.");
        add(articles, "sql joins",
                List.of("join", "joins", "inner join", "left join", "outer join", "cross join", "self join"),
                "Joins combine rows from related tables.\n"
                        + "• INNER JOIN returns only matching rows.\n"
                        + "• LEFT JOIN keeps all left rows and fills NULLs when no match exists.\n"
                        + "• RIGHT JOIN is the mirror case; FULL OUTER JOIN keeps unmatched rows from both sides.\n"
                        + "• CROSS JOIN produces the Cartesian product and is rarely wanted by accident.\n"
                        + "Filter on the correct side of an outer join: a WHERE condition on the right table silently "
                        + "turns a LEFT JOIN into an INNER JOIN.");
        add(articles, "normalization",
                List.of("normalization", "normalisation", "normal form", "1nf", "2nf", "3nf", "bcnf", "denormalization"),
                "Normalisation removes redundancy and update anomalies by structuring tables around functional "
                        + "dependencies: 1NF needs atomic values, 2NF removes partial dependencies on a composite key, "
                        + "3NF removes transitive dependencies, and BCNF tightens 3NF for every determinant. "
                        + "Analytics workloads often denormalise deliberately to avoid expensive joins; the trade-off "
                        + "is more redundancy to keep consistent.");
        add(articles, "keys and constraints",
                List.of("primary key", "foreign key", "unique constraint", "referential integrity", "constraint"),
                "Keys enforce identity and relationships. A primary key uniquely identifies each row and is "
                        + "usually an immutable surrogate such as an auto-increment id; a natural key such as an email "
                        + "can work but is harder to change. A foreign key references a key in another table and "
                        + "enforces referential integrity — ON DELETE can restrict, cascade or set null. Unique "
                        + "constraints prevent duplicate values, and most databases allow multiple NULLs in a unique column.");
        add(articles, "indexes",
                List.of("index", "indexes", "b-tree", "b tree", "composite index", "covering index"),                "An index is an auxiliary structure, usually a B-tree, that speeds lookups at the cost of extra "
                        + "storage and slower writes. Composite indexes are usable left-to-right: an index on "
                        + "(tenant_id, created_at) helps filter by tenant and sort by date, but a query on created_at alone "
                        + "cannot use it efficiently. Covering indexes include all selected columns so the engine can "
                        + "answer from the index alone. Use EXPLAIN to confirm a query actually uses its index.");
        add(articles, "transactions",
                List.of("transaction", "acid", "isolation level", "dirty read", "phantom read", "rollback", "commit"),
                "Transactions group statements into one atomic unit with ACID properties: atomicity, consistency, "
                        + "isolation and durability. Isolation levels trade correctness for concurrency — READ COMMITTED "
                        + "prevents dirty reads, REPEATABLE READ prevents non-repeatable reads, and SERIALIZABLE prevents "
                        + "phantom reads at the highest cost. Choose the weakest level that satisfies the business rule, "
                        + "and keep transactions short to reduce lock contention.");
        add(articles, "hash tables",
                List.of("hash table", "hash map", "hashmap", "hashing", "collision", "open addressing"),
                "A hash table maps keys to values through a hash function, giving O(1) average lookup, insert and "
                        + "delete. Collisions are handled by chaining (lists or trees per bucket) or open addressing "
                        + "(probing other slots). Performance degrades as the load factor rises, so implementations "
                        + "resize and rehash. Worst case is O(n) when many keys collide; a weak hash function or "
                        + "adversarial input can trigger that.");
        add(articles, "big o notation",
                List.of("big o", "complexity", "time complexity", "space complexity", "o(n)", "asymptotic"),
                "Big-O describes how an algorithm's cost grows with input size, ignoring constants. Common classes "
                        + "from fast to slow: O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ). Binary search is O(log n), "
                        + "good sorting is O(n log n), and nested loops over the same input are usually O(n²). "
                        + "Amortised analysis explains why dynamic array appends are O(1) on average despite occasional resizing.");
        add(articles, "recursion",
                List.of("recursion", "recursive", "base case", "call stack", "memoization", "dynamic programming"),
                "Recursion solves a problem by calling itself on smaller inputs. Every recursive function needs a "
                        + "base case, or it overflows the call stack. Overlapping subproblems cause exponential work "
                        + "unless results are memoised, which turns many recurrences into dynamic programming. "
                        + "Iteration avoids stack depth limits; recursion is usually clearer for trees and divide-and-conquer.");
        add(articles, "dbms",
                List.of("dbms", "database management", "relational database", "nosql", "cap theorem", "acid vs base"),
                "A DBMS manages storage, concurrency, recovery and access control for structured data. Relational "
                        + "databases enforce schemas and use SQL; NoSQL families (document, key-value, wide-column, graph) "
                        + "trade some consistency for scale or flexibility. The CAP theorem says a distributed store "
                        + "cannot guarantee consistency, availability and partition tolerance simultaneously — under a "
                        + "network partition you choose consistency or availability.");
        add(articles, "operating systems",
                List.of("operating system", "os", "process", "thread", "virtual memory", "paging", "scheduler"),
                "An operating system multiplexes hardware across processes. A process has its own address space; "
                        + "threads share one and are cheaper to switch. The scheduler decides which runnable thread gets "
                        + "a CPU. Virtual memory gives each process a private address space backed by physical frames, "
                        + "with page tables translating addresses; a page fault loads missing pages from disk. "
                        + "System calls are the controlled boundary between user mode and kernel mode.");
        add(articles, "deadlock",
                List.of("deadlock", "livelock", "starvation", "coffman", "banker"),
                "Deadlock occurs when threads wait on each other in a cycle. The four Coffman conditions are mutual "
                        + "exclusion, hold-and-wait, no preemption and circular wait; breaking any one prevents it. "
                        + "Practical strategies are lock ordering, lock timeouts, try-lock with backoff, and reducing "
                        + "lock scope. Detection builds a wait-for graph and breaks cycles; avoidance (e.g. Banker's "
                        + "algorithm) grants resources only when the system stays in a safe state.");
        add(articles, "concurrency",
                List.of("concurrency", "race condition", "mutex", "semaphore", "atomic", "thread safety", "synchronized"),
                "Concurrency bugs appear when threads access shared mutable state without coordination. A race "
                        + "condition is an outcome that depends on timing; guard critical sections with mutexes or "
                        + "atomics, and keep them small. Semaphores limit concurrent access to a pool of resources. "
                        + "Prefer immutability and message passing where possible — shared state is the root of most "
                        + "thread-safety problems.");
        add(articles, "tcp and udp",
                List.of("tcp", "udp", "three-way handshake", "handshake", "congestion control", "packet loss"),
                "TCP is connection-oriented and reliable: a three-way handshake establishes the connection, "
                        + "sequence numbers and acknowledgements detect loss, and retransmission recovers it. Flow "
                        + "control protects the receiver; congestion control protects the network. UDP is connectionless "
                        + "with no delivery guarantee, which suits streaming, gaming and DNS where low latency matters "
                        + "more than perfect delivery.");
        add(articles, "http and https",
                List.of("http", "https", "tls", "status code", "rest", "header", "cookie"),
                "HTTP is a stateless request/response protocol: methods express intent (GET, POST, PUT, PATCH, "
                        + "DELETE), headers carry metadata, and status codes summarise the result (2xx success, 3xx "
                        + "redirect, 4xx client error, 5xx server error). HTTPS wraps HTTP in TLS, which authenticates "
                        + "the server and encrypts traffic. Cookies and tokens carry session state because the protocol "
                        + "itself does not.");
        add(articles, "rest api design",
                List.of("api", "rest", "restful", "graphql", "grpc", "idempotent", "pagination"),
                "REST models resources with nouns and uses HTTP verbs for operations. Good APIs are stateless, "
                        + "versioned, and return consistent error shapes. GET and PUT are idempotent; POST is not, so "
                        + "payment and order creation should accept an idempotency key. Paginate collections instead of "
                        + "returning everything, and validate all input at the boundary. GraphQL gives clients flexible "
                        + "selection, while gRPC is efficient for internal service-to-service calls.");
        add(articles, "git",
                List.of("git", "version control", "branch", "merge", "rebase", "conflict", "commit"),
                "Git is a distributed version control system where each commit is an immutable snapshot with a "
                        + "content hash. Branches are cheap pointers; merging preserves history, while rebasing rewrites "
                        + "commits onto a new base for a linear log — never rebase a shared branch. Conflicts happen when "
                        + "two changes touch the same lines; resolve them, test, and commit the result.");
        add(articles, "docker",
                List.of("docker", "container", "dockerfile", "image", "namespaces", "cgroups"),
                "Docker packages an application and its dependencies into an image; a container is a running image "
                        + "isolated with Linux namespaces and limited by cgroups. Dockerfile layers are cached, so put "
                        + "frequently changing steps last. Containers share the host kernel, which makes them lighter "
                        + "than virtual machines but not a hard security boundary on their own.");
        add(articles, "kubernetes",
                List.of("kubernetes", "k8s", "pod", "deployment", "service", "ingress", "helm"),
                "Kubernetes orchestrates containers across machines. A Pod is the smallest deployable unit; a "
                        + "Deployment manages replicated Pods and rolling updates; a Service gives them a stable virtual "
                        + "IP; an Ingress routes external HTTP traffic. Controllers continuously reconcile actual state "
                        + "toward desired state, which is why you declare manifests instead of issuing imperative commands.");
        add(articles, "cloud computing",
                List.of("cloud", "aws", "azure", "gcp", "iaas", "paas", "saas", "serverless", "elasticity"),
                "Cloud computing delivers compute, storage and networking on demand. IaaS gives raw virtual "
                        + "machines, PaaS manages the runtime so you deploy code, and SaaS delivers finished applications. "
                        + "Elasticity scales capacity with demand; serverless removes server management but adds cold-start "
                        + "and execution-limit constraints. Design for failure, use managed services where they fit, and "
                        + "watch data-transfer costs.");
        add(articles, "devops",
                List.of("devops", "ci cd", "ci/cd", "continuous integration", "continuous delivery", "infrastructure as code",
                        "observability", "monitoring"),
                "DevOps shortens the path from commit to production. Continuous integration builds and tests every "
                        + "change; continuous delivery keeps the main branch releasable; infrastructure as code makes "
                        + "environments reproducible. Observability — metrics, logs and traces — turns production behaviour "
                        + "into diagnosable signals. Track lead time, deployment frequency, change-failure rate and "
                        + "recovery time to measure improvement.");
        add(articles, "cybersecurity",
                List.of("security", "cybersecurity", "owasp", "injection", "xss", "csrf", "least privilege", "vulnerability"),
                "Security is built from the CIA triad: confidentiality, integrity and availability. Apply least "
                        + "privilege, validate input at boundaries, encode output, and never trust client-supplied "
                        + "authorisation data. The OWASP Top 10 highlights broken access control, injection, insecure "
                        + "design, misconfiguration and vulnerable dependencies. Defence in depth layers controls so one "
                        + "failure does not expose everything.");
        add(articles, "encryption and hashing",
                List.of("encryption", "hashing", "hash function", "bcrypt", "symmetric", "asymmetric", "salt"),
                "Encryption is reversible with a key; hashing is one-way. Symmetric encryption (AES) is fast and "
                        + "needs shared key management; asymmetric encryption (RSA, ECC) supports key exchange and "
                        + "signatures. Passwords must be hashed with a slow, salted algorithm such as bcrypt or Argon2, "
                        + "never encrypted or stored in plain text. TLS combines both families to secure traffic.");
        add(articles, "jwt",
                List.of("jwt", "json web token", "bearer token", "token", "claims", "signature"),
                "A JSON Web Token has three Base64URL parts: header, payload and signature. The payload carries "
                        + "claims such as subject and expiry, but it is only encoded, not encrypted — never put secrets "
                        + "there. The server verifies the signature with its key and checks exp/nbf before trusting the "
                        + "token. JWTs suit stateless authentication; revocation requires short lifetimes, a denylist, "
                        + "or refresh-token rotation.");
        add(articles, "caching",
                List.of("cache", "caching", "redis", "ttl", "cache invalidation", "cdn"),
                "Caching trades freshness for speed. Cache-aside loads on a miss and stores the result with a TTL; "
                        + "write-through updates the cache with the database; write-behind defers database writes. "
                        + "Invalidation is the hard part — stale entries must expire or be evicted deliberately. Redis is "
                        + "common for shared caches, and CDNs cache static assets close to users. Always measure hit ratio "
                        + "and keep a fallback path when the cache is down.");
        add(articles, "system design",
                List.of("system design", "scalability", "load balancer", "sharding", "replication", "message queue",
                        "high availability"),
                "System design starts with requirements: functional behaviour, scale, latency and consistency. "
                        + "Estimate traffic and storage, then sketch components: clients, load balancers, stateless "
                        + "services, caches, queues and databases. Scale reads with replicas and caches, writes with "
                        + "partitioning, and decouple slow work with queues. Replication and sharding introduce "
                        + "consistency trade-offs, so state them explicitly rather than assuming strong consistency.");
        add(articles, "microservices",
                List.of("microservice", "microservices", "monolith", "service mesh", "distributed tracing", "bounded context"),
                "Microservices split an application into independently deployable services aligned with business "
                        + "capabilities. The benefits are independent scaling and release cadence; the costs are network "
                        + "failures, data consistency, and operational overhead. Keep contracts explicit, make services "
                        + "idempotent, add tracing and centralised logging, and start with a modular monolith unless the "
                        + "team and scale justify distribution.");
        add(articles, "software testing",
                List.of("testing", "unit test", "integration test", "end-to-end", "tdd", "mock", "test pyramid",
                        "coverage"),
                "The test pyramid favours many fast unit tests, fewer integration tests and a thin end-to-end layer. "
                        + "Unit tests isolate logic with fakes or mocks; integration tests verify real boundaries such as "
                        + "the database; end-to-end tests cover critical user journeys. Test behaviour, not implementation "
                        + "details, and treat coverage as a signal rather than a target. In test-driven development, a "
                        + "failing test defines the next increment.");
        add(articles, "data structures",
                List.of("data structure", "array", "linked list", "stack", "queue", "tree", "graph", "heap", "binary search"),
                "Choose data structures by operation cost. Arrays give O(1) index access but O(n) inserts; linked "
                        + "lists insert in O(1) with a reference but scan in O(n). Stacks (LIFO) and queues (FIFO) model "
                        + "traversal and scheduling. Balanced trees and heaps support O(log n) ordered operations; hash "
                        + "tables give O(1) average lookup; graphs model relationships and are traversed with BFS or DFS.");
        add(articles, "javascript",
                List.of("javascript", "js", "event loop", "promise", "async await", "closure", "dom", "node"),
                "JavaScript is single-threaded with an event loop: synchronous code runs to completion, then "
                        + "callbacks, promises and timers execute from queues. Promises and async/await express "
                        + "asynchronous flows without callback nesting. Closures capture their defining scope, which "
                        + "enables modules and private state. In browsers the DOM represents the page; in Node.js the "
                        + "same language runs server-side with non-blocking I/O.");
        add(articles, "c++",
                List.of("c++", "cpp", "raii", "smart pointer", "stl", "template", "move semantics"),
                "C++ gives deterministic control over memory and performance. RAII ties resource lifetime to object "
                        + "scope, and smart pointers (unique_ptr, shared_ptr) make ownership explicit. The STL provides "
                        + "containers, iterators and algorithms; templates enable compile-time generics; move semantics "
                        + "avoid unnecessary copies. Undefined behaviour — out-of-bounds access, dangling references — is "
                        + "the main source of subtle production bugs.");
        add(articles, "go",
                List.of("golang", "go language", "goroutine", "channel", "go routine"),
                "Go emphasises simplicity and fast builds. Goroutines are lightweight threads scheduled by the Go "
                        + "runtime, and channels communicate between them — the guidance is to share memory by "
                        + "communicating rather than the reverse. Errors are returned as values and checked explicitly. "
                        + "Interfaces are satisfied implicitly, which keeps packages decoupled. Garbage collection is "
                        + "concurrent and low-pause.");
        add(articles, "rust",
                List.of("rust", "ownership", "borrowing", "lifetime", "borrow checker"),
                "Rust enforces memory safety at compile time through ownership: each value has one owner, moves "
                        + "transfer ownership, and references are checked by the borrow checker — many references or one "
                        + "mutable reference, never both. Lifetimes make reference validity explicit. There is no garbage "
                        + "collector. Option and Result model absence and failure without exceptions, and the type system "
                        + "makes data races hard to express.");
        add(articles, "agile",
                List.of("agile", "scrum", "sprint", "kanban", "standup", "retrospective", "backlog"),
                "Agile delivers software in small, tested increments with frequent feedback. Scrum organises work in "
                        + "sprints with a prioritised backlog, daily stand-ups and a retrospective; Kanban limits "
                        + "work-in-progress and optimises flow. The point is shorter feedback loops and adaptation, not "
                        + "ceremony — measure outcomes such as cycle time and escaped defects.");

        return List.copyOf(articles.values());
    }

    private static void add(Map<String, Article> articles, String topic, List<String> keywords, String body) {
        articles.put(topic, new Article(keywords, body));
    }
}

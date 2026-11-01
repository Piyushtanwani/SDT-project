package com.elearning.config;

import com.elearning.models.Course;
import com.elearning.models.ExamQuestion;
import com.elearning.models.Module;
import com.elearning.models.Skill;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ExamQuestionRepository;
import com.elearning.repositories.ModuleRepository;
import com.elearning.repositories.SkillRepository;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/**
 * Seeds a realistic technical assessment catalog into an empty database.
 * It never touches existing rows: if any course is present, seeding is skipped.
 *
 * The catalog itself lives in src/main/resources/seed/*.json, one file per course, so the
 * learning material and question banks can grow without turning this class into a novel.
 */
@Component
public class ContentSeeder {

    private static final Logger log = LoggerFactory.getLogger(ContentSeeder.class);
    private static final String SEED_LOCATION = "classpath*:seed/*.json";

    private final CourseRepository courseRepository;
    private final ModuleRepository moduleRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final SkillRepository skillRepository;

    public ContentSeeder(CourseRepository courseRepository,
                         ModuleRepository moduleRepository,
                         ExamQuestionRepository examQuestionRepository,
                         SkillRepository skillRepository) {
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.examQuestionRepository = examQuestionRepository;
        this.skillRepository = skillRepository;
    }

    @Transactional
    public void seedIfEmpty() {
        seedSkillsIfEmpty();

        if (courseRepository.count() > 0) {
            log.info("Courses already exist; demo content seeding skipped.");
            return;
        }

        List<CourseSeed> catalog = catalog();
        int moduleCount = 0;
        int questionCount = 0;
        for (CourseSeed seed : catalog) {
            Course course = new Course();
            course.setName(seed.name());
            course.setDescription(seed.description());
            course.setDuration(seed.duration());
            course.setRating(seed.rating());
            course = courseRepository.save(course);

            int moduleNumber = 1;
            for (ModuleSeed mod : seed.modules()) {
                Module module = new Module();
                module.setCourseId(course.getId());
                module.setModuleNumber(moduleNumber++);
                module.setModuleTitle(mod.title());
                module.setContent(new ArrayList<>(mod.content()));
                module.setImageUrls(new ArrayList<>());
                module.setLastUpdated(LocalDateTime.now());
                moduleRepository.save(module);
                moduleCount++;
            }

            List<ExamQuestion> questions = new ArrayList<>();
            for (Q q : seed.questions()) {
                ExamQuestion question = new ExamQuestion();
                question.setCourseId(course.getId());
                question.setQuestionText(q.text());
                question.setOptionA(q.a());
                question.setOptionB(q.b());
                question.setOptionC(q.c());
                question.setOptionD(q.d());
                question.setCorrectOption(q.correct());
                question.setExplanation(q.explanation());
                question.setDifficulty(q.difficulty());
                questions.add(question);
            }
            examQuestionRepository.saveAll(questions);
            questionCount += questions.size();
        }

        log.info("Seeded {} courses, {} modules and {} exam questions.",
                catalog.size(), moduleCount, questionCount);
    }

    private void seedSkillsIfEmpty() {
        if (skillRepository.count() > 0) {
            return;
        }
        List<String> names = List.of(
                "Java", "Python", "C", "C++", "C#", "Go", "Rust", "JavaScript", "TypeScript",
                "React", "Angular", "Vue.js", "Node.js", "Spring Boot", "Django",
                "HTML", "CSS", "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis",
                "Docker", "Kubernetes", "AWS", "Azure", "Linux", "Git",
                "REST APIs", "System Design", "Data Structures", "Algorithms",
                "Operating Systems", "Computer Networks", "Cybersecurity", "Machine Learning");
        for (String name : names) {
            Skill skill = new Skill();
            skill.setName(name);
            skillRepository.save(skill);
        }
        log.info("Seeded {} community skills", names.size());
    }

    record Q(String text, String a, String b, String c, String d,
             String correct, String explanation, String difficulty) {
    }

    record ModuleSeed(String title, List<String> content) {
    }

    record CourseSeed(String name, String description, String duration, double rating,
                      List<ModuleSeed> modules, List<Q> questions) {
    }

    static List<Q> allQuestions() {
        return catalog().stream().flatMap(seed -> seed.questions().stream()).toList();
    }

    /**
     * Reads the whole seed catalog, sorted by file name so course order is stable across
     * restarts. Parsed once and cached: tests and seeding share the same in-memory copy.
     */
    static List<CourseSeed> catalog() {
        return CatalogCache.load();
    }

    private static final class CatalogCache {

        private static final ObjectMapper MAPPER = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        private static volatile List<CourseSeed> cached;

        static List<CourseSeed> load() {
            List<CourseSeed> current = cached;
            if (current != null) {
                return current;
            }
            synchronized (CatalogCache.class) {
                if (cached == null) {
                    cached = read();
                }
                return cached;
            }
        }

        private static List<CourseSeed> read() {
            Resource[] resources;
            try {
                resources = new PathMatchingResourcePatternResolver().getResources(SEED_LOCATION);
            } catch (IOException e) {
                throw new IllegalStateException("Cannot list the seed catalog resources", e);
            }
            List<CourseSeed> seeds = new ArrayList<>();
            for (Resource resource : Arrays.stream(resources)
                    .sorted(Comparator.comparing(r -> String.valueOf(r.getFilename())))
                    .toList()) {
                String name = String.valueOf(resource.getFilename());
                try (InputStream in = resource.getInputStream()) {
                    CourseSeed seed = MAPPER.readValue(in, CourseSeed.class);
                    if (seed.name() == null || seed.name().isBlank()) {
                        throw new IllegalStateException("Seed file " + name + " has no course name");
                    }
                    seeds.add(seed);
                } catch (IOException e) {
                    throw new UncheckedIOException("Seed file " + name + " is not valid JSON", e);
                }
            }
            if (seeds.isEmpty()) {
                throw new IllegalStateException("No seed catalog files found on " + SEED_LOCATION);
            }
            return List.copyOf(seeds);
        }
    }
}

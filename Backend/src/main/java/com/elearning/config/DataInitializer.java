package com.elearning.config;

import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final ContentSeeder contentSeeder;
    private final DataSource dataSource;
    private final String bootstrapAdminPassword;
    private final boolean seedDemoContent;

    public DataInitializer(UserRepository userRepository,
                           JdbcTemplate jdbcTemplate,
                           PasswordEncoder passwordEncoder,
                           ContentSeeder contentSeeder,
                           DataSource dataSource,
                           @Value("${app.bootstrap.admin-password:}") String bootstrapAdminPassword,
                           @Value("${app.seed.demo-content:true}") boolean seedDemoContent) {
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.contentSeeder = contentSeeder;
        this.dataSource = dataSource;
        this.bootstrapAdminPassword = bootstrapAdminPassword;
        this.seedDemoContent = seedDemoContent;
    }

    @Override
    public void run(String... args) {
        if (seedDemoContent) {
            contentSeeder.seedIfEmpty();
        }

        if (isPostgreSQL()) {
            fixCourseTableConstraints();
        }

        if (bootstrapAdminPassword == null || bootstrapAdminPassword.isBlank()) {
            log.warn("app.bootstrap.admin-password is not set; administrator accounts were not created.");
            return;
        }
        seedAdmin("bitecodes.global@gmail.com", "admin", "Admin");
        seedAdmin("admin@bitecodes.com", "superadmin", "Super Admin");
    }

    private boolean isPostgreSQL() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getMetaData().getDatabaseProductName().toLowerCase().contains("postgres");
        } catch (Exception e) {
            log.warn("Could not detect database vendor: {}", e.getMessage());
            return false;
        }
    }

    private void fixCourseTableConstraints() {
        try {
            jdbcTemplate.execute("ALTER TABLE \"course\" ALTER COLUMN \"slug\" DROP NOT NULL");
            log.info("Dropped NOT NULL constraint on course.slug");
        } catch (Exception e) {
            log.info("Course.slug constraint already relaxed or unavailable: {}", e.getMessage());
        }

        try {
            List<Map<String, Object>> cols = jdbcTemplate.queryForList(
                    "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'course'");
            log.info("Detected {} columns on the course table", cols.size());
        } catch (Exception e) {
            log.debug("Could not inspect course table: {}", e.getMessage());
        }
    }

    private void seedAdmin(String email, String username, String name) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isEmpty()) {
            User admin = new User();
            admin.setEmail(email);
            admin.setUsername(username);
            admin.setName(name);
            admin.setPassword(passwordEncoder.encode(bootstrapAdminPassword));
            admin.setRole("ADMIN");
            admin.setEnabled(true);
            admin.setProfileurl("https://webcrumbs.cloud/placeholder");
            admin.setCreatedAt(LocalDateTime.now());
            userRepository.save(admin);
            log.info("Seeded administrator account {}", email);
            return;
        }

        User admin = existing.get();
        String currentPassword = admin.getPassword();
        // One-time migration for rows created before hashing was enforced.
        if (currentPassword != null && !currentPassword.startsWith("$2a$") && !currentPassword.startsWith("$2b$")) {
            admin.setPassword(passwordEncoder.encode(bootstrapAdminPassword));
            userRepository.save(admin);
            log.info("Migrated legacy plaintext password for {}", email);
        }
    }
}

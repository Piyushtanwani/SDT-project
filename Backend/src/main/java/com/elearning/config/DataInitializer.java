package com.elearning.config;

import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import java.util.Map;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public DataInitializer(UserRepository userRepository, JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        fixCourseTableConstraints();

        // Ensure default master admin exists
        seedAdmin("bitecodes.global@gmail.com", "admin", "Admin", "admin123");
        seedAdmin("admin@bitecodes.com", "superadmin", "Super Admin", "admin123");
    }

    private void fixCourseTableConstraints() {
        try {
            // Drop NOT NULL on legacy slug column if present
            jdbcTemplate.execute("ALTER TABLE \"course\" ALTER COLUMN \"slug\" DROP NOT NULL");
            System.out.println(">>> Successfully dropped NOT NULL constraint on course.slug");
        } catch (Exception e) {
            System.out.println(">>> Note on course.slug constraint: " + e.getMessage());
        }

        try {
            // Inspect and log all columns in course table
            List<Map<String, Object>> cols = jdbcTemplate.queryForList(
                "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'course'"
            );
            System.out.println(">>> Course table columns: " + cols);
        } catch (Exception e) {
            System.out.println(">>> Could not inspect course table: " + e.getMessage());
        }
    }

    private void seedAdmin(String email, String username, String name, String password) {
        if (userRepository.findByEmail(email).isEmpty()) {
            User admin = new User();
            admin.setEmail(email);
            admin.setUsername(username);
            admin.setName(name);
            admin.setPassword(password);
            admin.setRole("ADMIN");
            admin.setEnabled(true);
            admin.setProfileurl("https://webcrumbs.cloud/placeholder");
            admin.setCreatedAt(LocalDateTime.now());
            userRepository.save(admin);
            System.out.println(">>> Seeded Admin Account: " + email + " / " + password);
        }
    }
}

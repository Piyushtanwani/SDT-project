package com.elearning.config;

import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        fixCourseTableConstraints();

        // Ensure default master admin accounts exist with hashed passwords
        seedAdmin("bitecodes.global@gmail.com", "admin", "Admin", "admin123");
        seedAdmin("admin@bitecodes.com", "superadmin", "Super Admin", "admin123");
    }

    private void fixCourseTableConstraints() {
        try {
            jdbcTemplate.execute("ALTER TABLE \"course\" ALTER COLUMN \"slug\" DROP NOT NULL");
            System.out.println(">>> Successfully dropped NOT NULL constraint on course.slug");
        } catch (Exception e) {
            System.out.println(">>> Note on course.slug constraint: " + e.getMessage());
        }

        try {
            List<Map<String, Object>> cols = jdbcTemplate.queryForList(
                "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'course'"
            );
            System.out.println(">>> Course table columns: " + cols.size() + " columns detected");
        } catch (Exception e) {
            System.out.println(">>> Could not inspect course table: " + e.getMessage());
        }
    }

    private void seedAdmin(String email, String username, String name, String rawPassword) {
        Optional<User> existingUserOpt = userRepository.findByEmail(email);
        if (existingUserOpt.isEmpty()) {
            User admin = new User();
            admin.setEmail(email);
            admin.setUsername(username);
            admin.setName(name);
            admin.setPassword(passwordEncoder.encode(rawPassword));
            admin.setRole("ADMIN");
            admin.setEnabled(true);
            admin.setProfileurl("https://webcrumbs.cloud/placeholder");
            admin.setCreatedAt(LocalDateTime.now());
            userRepository.save(admin);
            System.out.println(">>> Seeded Admin Account with BCrypt hash: " + email);
        } else {
            User existingAdmin = existingUserOpt.get();
            String currentPassword = existingAdmin.getPassword();
            // Migrate legacy plaintext password if not already BCrypt hashed
            if (currentPassword != null && !currentPassword.startsWith("$2a$") && !currentPassword.startsWith("$2b$")) {
                existingAdmin.setPassword(passwordEncoder.encode(currentPassword));
                userRepository.save(existingAdmin);
                System.out.println(">>> Migrated legacy plaintext password for: " + email);
            }
        }
    }
}

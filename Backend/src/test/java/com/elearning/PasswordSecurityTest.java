package com.elearning;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

class PasswordSecurityTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Test
    @DisplayName("SEC-05: BCrypt correctly encodes and matches passwords")
    void testBCrypt_EncodeAndMatch() {
        String rawPassword = "SecurePassword@2026!";
        String encoded = passwordEncoder.encode(rawPassword);

        assertNotNull(encoded);
        assertNotEquals(rawPassword, encoded);
        assertTrue(encoded.startsWith("$2a$") || encoded.startsWith("$2b$"));
        assertTrue(passwordEncoder.matches(rawPassword, encoded));
        assertFalse(passwordEncoder.matches("WrongPassword", encoded));
    }

    @Test
    @DisplayName("SEC-05: Different salts produce unique hashes for identical passwords")
    void testBCrypt_SaltUnique() {
        String rawPassword = "SamePassword123";
        String hash1 = passwordEncoder.encode(rawPassword);
        String hash2 = passwordEncoder.encode(rawPassword);

        assertNotEquals(hash1, hash2);
        assertTrue(passwordEncoder.matches(rawPassword, hash1));
        assertTrue(passwordEncoder.matches(rawPassword, hash2));
    }
}

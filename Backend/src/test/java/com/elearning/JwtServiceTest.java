package com.elearning;

import com.elearning.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-key-with-at-least-32-bytes!!";

    @Test
    @DisplayName("Generated token round-trips username and user id")
    void tokenRoundTrip() {
        JwtService jwtService = new JwtService(SECRET, 60_000);

        String token = jwtService.generateToken("learner@example.com", 42L);

        assertTrue(jwtService.isTokenValid(token));
        assertEquals("learner@example.com", jwtService.getUsernameFromToken(token));
        assertEquals(42L, jwtService.getUserIdFromToken(token));
        assertFalse(jwtService.isTokenExpired(token));
    }

    @Test
    @DisplayName("Token signed with a different secret is rejected")
    void tokenFromAnotherSecretIsRejected() {
        JwtService issuer = new JwtService(SECRET, 60_000);
        JwtService verifier = new JwtService("a-different-secret-key-with-32-bytes-min!!", 60_000);

        String token = issuer.generateToken("learner@example.com", 1L);

        assertFalse(verifier.isTokenValid(token));
        assertThrows(IllegalArgumentException.class, () -> verifier.getUsernameFromToken(token));
    }

    @Test
    @DisplayName("Expired tokens are rejected")
    void expiredTokenIsInvalid() {
        JwtService jwtService = new JwtService(SECRET, -1_000);

        String token = jwtService.generateToken("learner@example.com", 1L);

        assertFalse(jwtService.isTokenValid(token));
        assertTrue(jwtService.isTokenExpired(token));
    }

    @Test
    @DisplayName("Tampered tokens are rejected")
    void tamperedTokenIsInvalid() {
        JwtService jwtService = new JwtService(SECRET, 60_000);
        String token = jwtService.generateToken("learner@example.com", 1L);
        String tampered = token.substring(0, token.length() - 2) + (token.endsWith("A") ? "BB" : "AA");

        assertFalse(jwtService.isTokenValid(tampered));
    }

    @Test
    @DisplayName("Blank secret produces a per-instance ephemeral key")
    void blankSecretGeneratesEphemeralKey() {
        JwtService first = new JwtService("", 60_000);
        JwtService second = new JwtService(null, 60_000);

        String token = first.generateToken("learner@example.com", 1L);

        assertTrue(first.isTokenValid(token));
        assertFalse(second.isTokenValid(token));
    }
}

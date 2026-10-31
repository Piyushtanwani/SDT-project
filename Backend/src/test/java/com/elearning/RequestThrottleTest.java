package com.elearning;

import com.elearning.services.RequestThrottle;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class RequestThrottleTest {

    @Test
    @DisplayName("Blocked once the failure limit is reached within the window")
    void blocksAfterLimit() {
        RequestThrottle throttle = new RequestThrottle();
        Duration window = Duration.ofMinutes(15);

        throttle.hit("login:user@example.com|127.0.0.1", window);
        throttle.hit("login:user@example.com|127.0.0.1", window);
        assertFalse(throttle.isBlocked("login:user@example.com|127.0.0.1", 3, window));

        throttle.hit("login:user@example.com|127.0.0.1", window);
        assertTrue(throttle.isBlocked("login:user@example.com|127.0.0.1", 3, window));
    }

    @Test
    @DisplayName("Keys are isolated from each other")
    void keysAreIsolated() {
        RequestThrottle throttle = new RequestThrottle();
        Duration window = Duration.ofMinutes(15);

        throttle.hit("login:user@example.com|127.0.0.1", window);
        throttle.hit("login:user@example.com|127.0.0.1", window);
        throttle.hit("login:user@example.com|127.0.0.1", window);

        assertTrue(throttle.isBlocked("login:user@example.com|127.0.0.1", 3, window));
        assertFalse(throttle.isBlocked("login:other@example.com|127.0.0.1", 3, window));
    }

    @Test
    @DisplayName("Reset clears the failure window")
    void resetClearsWindow() {
        RequestThrottle throttle = new RequestThrottle();
        Duration window = Duration.ofMinutes(15);

        throttle.hit("key", window);
        throttle.hit("key", window);
        assertTrue(throttle.isBlocked("key", 2, window));

        throttle.reset("key");
        assertFalse(throttle.isBlocked("key", 2, window));
    }

    @Test
    @DisplayName("Expired windows no longer block")
    void expiredWindowDoesNotBlock() throws InterruptedException {
        RequestThrottle throttle = new RequestThrottle();
        Duration window = Duration.ofMillis(1);

        throttle.hit("key", window);
        Thread.sleep(10);

        assertFalse(throttle.isBlocked("key", 1, window));
    }
}

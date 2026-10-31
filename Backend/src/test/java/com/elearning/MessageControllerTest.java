package com.elearning;

import com.elearning.controller.MessageController;
import com.elearning.security.JwtService;
import com.elearning.services.RequestThrottle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class MessageControllerTest {

    private static final String SECRET = "unit-test-secret-key-with-at-least-32-bytes!!";
    private static final Duration WINDOW = Duration.ofSeconds(10);

    private MessageController controller;
    private RequestThrottle throttle;
    private String token;

    @BeforeEach
    void setUp() {
        JwtService jwtService = new JwtService(SECRET, 60_000);
        throttle = new RequestThrottle();
        controller = new MessageController();
        ReflectionTestUtils.setField(controller, "jwtService", jwtService);
        ReflectionTestUtils.setField(controller, "requestThrottle", throttle);
        token = "Bearer " + jwtService.generateToken("learner@example.com", 7L);
    }

    @Test
    @DisplayName("Sending on behalf of another user is rejected")
    void spoofedSenderIsRejected() {
        var response = controller.sendMessage(dto(9L, "hello"), token);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("Blank and oversized messages are rejected before storage")
    void invalidContentIsRejected() {
        assertEquals(HttpStatus.BAD_REQUEST, controller.sendMessage(dto(7L, "   "), token).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, controller.sendMessage(dto(7L, "x".repeat(2001)), token).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, controller.sendMessage(dto(7L, null), token).getStatusCode());
    }

    @Test
    @DisplayName("More than twenty messages in ten seconds is rate limited")
    void messageFloodIsBlocked() {
        for (int i = 0; i < 20; i++) {
            assertTrue(throttle.tryAcquire("chat:7", 20, WINDOW));
        }

        var response = controller.sendMessage(dto(7L, "one message too many"), token);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals("You are sending messages too quickly. Please wait a few seconds.", response.getBody());
        assertEquals("10", response.getHeaders().getFirst("Retry-After"));
    }

    private static MessageController.MessageDTO dto(Long senderId, String content) {
        MessageController.MessageDTO dto = new MessageController.MessageDTO();
        dto.setSenderId(senderId);
        dto.setReceiverId(3L);
        dto.setContent(content);
        return dto;
    }
}

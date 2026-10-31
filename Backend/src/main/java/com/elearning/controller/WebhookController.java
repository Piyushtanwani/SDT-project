package com.elearning.controller;

import com.elearning.services.AssistantService;
import com.elearning.services.MessagingService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Inbound webhooks for Telegram and WhatsApp. Every message is answered by the
 * deterministic AssistantService, so the channels keep working without external AI.
 */
@RestController
@RequestMapping("/webhooks")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final AssistantService assistantService;
    private final MessagingService messagingService;
    private final ObjectMapper objectMapper;
    private final String telegramWebhookSecret;
    private final String whatsAppVerifyToken;
    private final String whatsAppAppSecret;

    public WebhookController(
            AssistantService assistantService,
            MessagingService messagingService,
            ObjectMapper objectMapper,
            @Value("${app.telegram.webhook-secret:}") String telegramWebhookSecret,
            @Value("${app.whatsapp.verify-token:}") String whatsAppVerifyToken,
            @Value("${app.whatsapp.app-secret:}") String whatsAppAppSecret) {
        this.assistantService = assistantService;
        this.messagingService = messagingService;
        this.objectMapper = objectMapper;
        this.telegramWebhookSecret = telegramWebhookSecret == null ? "" : telegramWebhookSecret.strip();
        this.whatsAppVerifyToken = whatsAppVerifyToken == null ? "" : whatsAppVerifyToken.strip();
        this.whatsAppAppSecret = whatsAppAppSecret == null ? "" : whatsAppAppSecret.strip();
    }

    @PostMapping("/telegram")
    public ResponseEntity<String> telegram(
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
            @RequestBody(required = false) String rawBody) {
        if (!messagingService.isTelegramConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("Telegram is not configured");
        }
        if (!telegramWebhookSecret.isBlank() && !constantTimeEquals(secret, telegramWebhookSecret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid webhook secret");
        }
        try {
            JsonNode root = objectMapper.readTree(rawBody == null ? "{}" : rawBody);
            JsonNode message = root.path("message");
            String text = message.path("text").asText("");
            String chatId = message.path("chat").path("id").asText("");
            if (!text.isBlank() && !chatId.isBlank()) {
                messagingService.sendTelegram(chatId, assistantService.answer(text));
            }
        } catch (Exception e) {
            log.warn("Telegram webhook could not be processed: {}", e.getClass().getSimpleName());
        }
        return ResponseEntity.ok("ok");
    }

    @GetMapping("/whatsapp")
    public ResponseEntity<String> verifyWhatsApp(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String token,
            @RequestParam(name = "hub.challenge", required = false) String challenge) {
        if (whatsAppVerifyToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("WhatsApp is not configured");
        }
        if ("subscribe".equals(mode) && constantTimeEquals(token, whatsAppVerifyToken)) {
            return ResponseEntity.ok(challenge == null ? "" : challenge);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification failed");
    }

    @PostMapping("/whatsapp")
    public ResponseEntity<String> whatsapp(
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody(required = false) String rawBody) {
        if (!messagingService.isWhatsAppConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("WhatsApp is not configured");
        }
        if (!whatsAppAppSecret.isBlank() && !validWhatsAppSignature(rawBody, signature)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid signature");
        }
        try {
            JsonNode root = objectMapper.readTree(rawBody == null ? "{}" : rawBody);
            for (JsonNode entry : root.path("entry")) {
                for (JsonNode change : entry.path("changes")) {
                    JsonNode messages = change.path("value").path("messages");
                    if (!messages.isArray()) {
                        continue;
                    }
                    for (JsonNode message : messages) {
                        String from = message.path("from").asText("");
                        String text = message.path("text").path("body").asText("");
                        if (!from.isBlank() && !text.isBlank()) {
                            messagingService.sendWhatsApp(from, assistantService.answer(text));
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("WhatsApp webhook could not be processed: {}", e.getClass().getSimpleName());
        }
        return ResponseEntity.ok("ok");
    }

    private boolean validWhatsAppSignature(String rawBody, String signature) {
        if (signature == null || !signature.startsWith("sha256=")) {
            return false;
        }
        try {
            byte[] provided = HexFormat.of().parseHex(signature.substring("sha256=".length()));
            byte[] expected = hmacSha256(rawBody == null ? "" : rawBody, whatsAppAppSecret);
            return MessageDigest.isEqual(expected, provided);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static byte[] hmacSha256(String body, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("HmacSHA256 is unavailable", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}

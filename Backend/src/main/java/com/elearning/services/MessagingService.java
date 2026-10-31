package com.elearning.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MessagingService {

    private static final Logger log = LoggerFactory.getLogger(MessagingService.class);
    private static final int MAX_CHUNK = 4000;
    private static final String TELEGRAM_API = "https://api.telegram.org/bot%s/sendMessage";
    private static final String WHATSAPP_API = "https://graph.facebook.com/v20.0/%s/messages";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String telegramBotToken;
    private final String telegramBotUsername;
    private final String whatsAppToken;
    private final String whatsAppPhoneNumberId;
    private final String whatsAppDisplayNumber;

    public MessagingService(
            ObjectMapper objectMapper,
            @Value("${app.telegram.bot-token:}") String telegramBotToken,
            @Value("${app.telegram.bot-username:}") String telegramBotUsername,
            @Value("${app.whatsapp.token:}") String whatsAppToken,
            @Value("${app.whatsapp.phone-number-id:}") String whatsAppPhoneNumberId,
            @Value("${app.whatsapp.display-number:}") String whatsAppDisplayNumber) {
        this.objectMapper = objectMapper;
        this.telegramBotToken = telegramBotToken == null ? "" : telegramBotToken.strip();
        this.telegramBotUsername = telegramBotUsername == null ? "" : telegramBotUsername.strip();
        this.whatsAppToken = whatsAppToken == null ? "" : whatsAppToken.strip();
        this.whatsAppPhoneNumberId = whatsAppPhoneNumberId == null ? "" : whatsAppPhoneNumberId.strip();
        this.whatsAppDisplayNumber = whatsAppDisplayNumber == null ? "" : whatsAppDisplayNumber.strip();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public boolean isTelegramConfigured() {
        return !telegramBotToken.isBlank();
    }

    public boolean isWhatsAppConfigured() {
        return !whatsAppToken.isBlank() && !whatsAppPhoneNumberId.isBlank();
    }

    public String telegramLink() {
        if (telegramBotUsername.isBlank()) {
            return null;
        }
        String username = telegramBotUsername.startsWith("@")
                ? telegramBotUsername.substring(1)
                : telegramBotUsername;
        return "https://t.me/" + username;
    }

    public String whatsappLink() {
        if (whatsAppDisplayNumber.isBlank()) {
            return null;
        }
        String digits = whatsAppDisplayNumber.replaceAll("[^0-9]", "");
        return digits.isBlank() ? null : "https://wa.me/" + digits;
    }

    public boolean sendTelegram(String chatId, String text) {
        if (!isTelegramConfigured() || chatId == null || chatId.isBlank()) {
            return false;
        }
        for (String chunk : chunks(text)) {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("chat_id", chatId);
            payload.put("text", chunk);
            payload.put("disable_web_page_preview", true);
            if (!post(String.format(TELEGRAM_API, telegramBotToken), payload, Map.of())) {
                return false;
            }
        }
        return true;
    }

    public boolean sendWhatsApp(String to, String text) {
        if (!isWhatsAppConfigured() || to == null || to.isBlank()) {
            return false;
        }
        for (String chunk : chunks(text)) {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", to);
            payload.put("type", "text");
            payload.put("text", Map.of("body", chunk));
            if (!post(String.format(WHATSAPP_API, whatsAppPhoneNumberId), payload,
                    Map.of("Authorization", "Bearer " + whatsAppToken))) {
                return false;
            }
        }
        return true;
    }

    private boolean post(String url, Map<String, Object> payload, Map<String, String> headers) {
        try {
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
            headers.forEach(builder::header);
            HttpResponse<String> response = httpClient.send(builder.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() / 100 != 2) {
                log.warn("Messaging provider returned HTTP {}", response.statusCode());
                return false;
            }
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Messaging request interrupted");
            return false;
        } catch (Exception e) {
            log.warn("Messaging request failed: {}", e.getClass().getSimpleName());
            return false;
        }
    }

    private static List<String> chunks(String text) {
        String value = text == null ? "" : text;
        if (value.length() <= MAX_CHUNK) {
            return List.of(value);
        }
        List<String> parts = new java.util.ArrayList<>();
        int index = 0;
        while (index < value.length()) {
            int end = Math.min(value.length(), index + MAX_CHUNK);
            parts.add(value.substring(index, end));
            index = end;
        }
        return parts;
    }
}

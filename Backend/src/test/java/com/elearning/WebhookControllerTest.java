package com.elearning;

import com.elearning.controller.WebhookController;
import com.elearning.repositories.CertificateRepository;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ModuleRepository;
import com.elearning.services.AssistantService;
import com.elearning.services.MessagingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class WebhookControllerTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private ModuleRepository moduleRepository;

    @Mock
    private CertificateRepository certificateRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AssistantService assistantService =
                new AssistantService(courseRepository, moduleRepository, certificateRepository);
        MessagingService messagingService = new MessagingService(
                new ObjectMapper(), "telegram-token", "sdt_helper", "whatsapp-token", "123456", "");
        WebhookController controller = new WebhookController(
                assistantService, messagingService, new ObjectMapper(),
                "telegram-secret", "whatsapp-verify-token", "whatsapp-app-secret");
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("WhatsApp verification returns the challenge for the configured token")
    void whatsAppVerificationChallenge() throws Exception {
        mockMvc.perform(get("/webhooks/whatsapp")
                        .param("hub.mode", "subscribe")
                        .param("hub.verify_token", "whatsapp-verify-token")
                        .param("hub.challenge", "challenge-123"))
                .andExpect(status().isOk())
                .andExpect(content().string("challenge-123"));
    }

    @Test
    @DisplayName("WhatsApp verification rejects an incorrect token")
    void whatsAppVerificationRejectsWrongToken() throws Exception {
        mockMvc.perform(get("/webhooks/whatsapp")
                        .param("hub.mode", "subscribe")
                        .param("hub.verify_token", "wrong-token")
                        .param("hub.challenge", "challenge-123"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("WhatsApp messages with an invalid signature are rejected")
    void whatsAppRejectsInvalidSignature() throws Exception {
        mockMvc.perform(post("/webhooks/whatsapp")
                        .header("X-Hub-Signature-256", "sha256=deadbeef")
                        .contentType("application/json")
                        .content("{\"entry\":[]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Telegram webhook requires the configured secret header")
    void telegramRequiresSecret() throws Exception {
        mockMvc.perform(post("/webhooks/telegram")
                        .header("X-Telegram-Bot-Api-Secret-Token", "wrong-secret")
                        .contentType("application/json")
                        .content("{\"message\":{}}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/webhooks/telegram")
                        .header("X-Telegram-Bot-Api-Secret-Token", "telegram-secret")
                        .contentType("application/json")
                        .content("{\"message\":{}}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Signed WhatsApp status callbacks without messages are acknowledged")
    void whatsAppStatusCallbackIsAcknowledged() throws Exception {
        String body = "{\"entry\":[{\"changes\":[{\"value\":{\"statuses\":[]}}]}]}";
        mockMvc.perform(post("/webhooks/whatsapp")
                        .header("X-Hub-Signature-256", "sha256=" + hmacHex(body))
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk());
    }

    private static String hmacHex(String body) throws Exception {
        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec(
                "whatsapp-app-secret".getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
        return java.util.HexFormat.of().formatHex(
                mac.doFinal(body.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }
}

package com.elearning;

import com.elearning.services.MessagingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MessagingServiceTest {

    private MessagingService service(String telegramToken, String username, String whatsAppToken,
                                     String phoneId, String displayNumber) {
        return new MessagingService(new ObjectMapper(), telegramToken, username, whatsAppToken, phoneId, displayNumber);
    }

    @Test
    @DisplayName("Channels stay disabled and never call out when unconfigured")
    void unconfiguredChannelsAreInert() {
        MessagingService messaging = service("", "", "", "", "");

        assertFalse(messaging.isTelegramConfigured());
        assertFalse(messaging.isWhatsAppConfigured());
        assertFalse(messaging.sendTelegram("123", "hello"));
        assertFalse(messaging.sendWhatsApp("123", "hello"));
        assertNull(messaging.telegramLink());
        assertNull(messaging.whatsappLink());
    }

    @Test
    @DisplayName("Telegram link normalizes the bot username")
    void telegramLink() {
        assertNull(service("token", "", "", "", "").telegramLink());
        assertEquals("https://t.me/sdt_helper", service("token", "@sdt_helper", "", "", "").telegramLink());
        assertEquals("https://t.me/sdt_helper", service("token", "sdt_helper", "", "", "").telegramLink());
    }

    @Test
    @DisplayName("WhatsApp link strips formatting characters from the display number")
    void whatsAppLink() {
        assertEquals("https://wa.me/919876543210",
                service("", "", "", "", "+91 98765 43210").whatsappLink());
        assertNull(service("", "", "", "", "").whatsappLink());
    }

    @Test
    @DisplayName("WhatsApp needs both token and phone number id")
    void whatsAppRequiresBothSettings() {
        assertFalse(service("", "", "token", "", "").isWhatsAppConfigured());
        assertFalse(service("", "", "", "123456", "").isWhatsAppConfigured());
        assertTrue(service("", "", "token", "123456", "").isWhatsAppConfigured());
    }

    @Test
    @DisplayName("Degenerate sends are rejected without network calls")
    void blankRecipientsAreRejected() {
        MessagingService messaging = service("token", "bot", "token", "123456", "");

        assertFalse(messaging.sendTelegram("", "hi"));
        assertFalse(messaging.sendWhatsApp(null, "hi"));
    }
}

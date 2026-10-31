package com.elearning.controller;

import com.elearning.services.AssistantService;
import com.elearning.services.MessagingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    private final AssistantService assistantService;
    private final MessagingService messagingService;

    public AssistantController(AssistantService assistantService, MessagingService messagingService) {
        this.assistantService = assistantService;
        this.messagingService = messagingService;
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody(required = false) Map<String, String> body) {
        String message = body == null ? "" : body.getOrDefault("message", "");
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("reply", assistantService.answer(message));
        response.put("source", AssistantService.SOURCE);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/channels")
    public Map<String, Object> channels() {
        Map<String, Object> telegram = new LinkedHashMap<>();
        telegram.put("configured", messagingService.isTelegramConfigured());
        telegram.put("url", messagingService.telegramLink());

        Map<String, Object> whatsapp = new LinkedHashMap<>();
        whatsapp.put("configured", messagingService.isWhatsAppConfigured());
        whatsapp.put("url", messagingService.whatsappLink());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("telegram", telegram);
        response.put("whatsapp", whatsapp);
        return response;
    }
}

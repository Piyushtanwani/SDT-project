package com.elearning.controller;

import com.elearning.models.Message;
import com.elearning.models.User;
import com.elearning.repositories.ConnectionRepository;
import com.elearning.repositories.MessageRepository;
import com.elearning.repositories.UserRepository;
import com.elearning.security.JwtService;
import com.elearning.services.RequestThrottle;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private static final int MAX_CONTENT_LENGTH = 2000;
    private static final int MAX_MESSAGES_PER_WINDOW = 20;
    private static final Duration MESSAGE_WINDOW = Duration.ofSeconds(10);

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RequestThrottle requestThrottle;

    public static class MessageDTO {
        private Long id;
        private Long senderId;
        private String senderUsername;
        private Long receiverId;
        private String content;
        private String timestamp;

        public MessageDTO() {}

        public MessageDTO(Message message) {
            this.id = message.getId();
            this.senderId = message.getSender().getId();
            this.senderUsername = message.getSender().getUsername();
            this.receiverId = message.getReceiver().getId();
            this.content = message.getContent();
            this.timestamp = message.getTimestamp().toString();
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getSenderId() { return senderId; }
        public void setSenderId(Long senderId) { this.senderId = senderId; }
        public String getSenderUsername() { return senderUsername; }
        public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
        public Long getReceiverId() { return receiverId; }
        public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    }

    @Autowired
    private ConnectionRepository connectionRepository;

    @Transactional
    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody MessageDTO messageDTO, @RequestHeader("Authorization") String token) {
        Long userId;
        try {
            userId = extractUserIdFromToken(token);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
        if (messageDTO.getSenderId() == null || !userId.equals(messageDTO.getSenderId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Token user ID does not match sender ID");
        }
        if (messageDTO.getContent() == null || messageDTO.getContent().isBlank()) {
            return ResponseEntity.badRequest().body("Message cannot be empty");
        }
        if (messageDTO.getContent().length() > MAX_CONTENT_LENGTH) {
            return ResponseEntity.badRequest().body("Message is too long (maximum " + MAX_CONTENT_LENGTH + " characters)");
        }
        if (messageDTO.getReceiverId() == null) {
            return ResponseEntity.badRequest().body("Receiver is required");
        }
        if (!requestThrottle.tryAcquire("chat:" + userId, MAX_MESSAGES_PER_WINDOW, MESSAGE_WINDOW)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(MESSAGE_WINDOW.toSeconds()))
                    .body("You are sending messages too quickly. Please wait a few seconds.");
        }

        User sender = userRepository.findById(messageDTO.getSenderId()).orElse(null);
        User receiver = userRepository.findById(messageDTO.getReceiverId()).orElse(null);
        if (sender == null || receiver == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        // Validate conversation membership (must be accepted connections)
        boolean connected = connectionRepository.findBySenderOrReceiverAndStatus(sender.getId(), "ACCEPTED")
                .stream()
                .anyMatch(c -> (c.getSender().getId().equals(receiver.getId()) || c.getReceiver().getId().equals(receiver.getId())));
        if (!connected) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You can only chat with accepted connections.");
        }

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(messageDTO.getContent());
        message.setTimestamp(new java.sql.Timestamp(System.currentTimeMillis()));

        Message savedMessage = messageRepository.save(message);
        MessageDTO responseDTO = new MessageDTO(savedMessage);

        String chatId = Math.min(messageDTO.getSenderId(), messageDTO.getReceiverId()) + "-" +
                Math.max(messageDTO.getSenderId(), messageDTO.getReceiverId());
        messagingTemplate.convertAndSend("/topic/messages/" + chatId, responseDTO);

        return ResponseEntity.ok(responseDTO);
    }

    @Transactional(readOnly = true)
    @GetMapping("/history/{receiverId}")
    public ResponseEntity<?> getMessageHistory(@PathVariable Long receiverId,
                                               @RequestHeader("Authorization") String token,
                                               @RequestParam(required = false) Long beforeId,
                                               @RequestParam(defaultValue = "100") int limit) {
        Long userId;
        try {
            userId = extractUserIdFromToken(token);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }

        int pageSize = Math.max(1, Math.min(limit, 200));
        Pageable page = PageRequest.of(0, pageSize + 1);
        List<Message> found = beforeId == null
                ? messageRepository.findConversation(userId, receiverId, page)
                : messageRepository.findConversationBefore(userId, receiverId, beforeId, page);

        boolean hasMore = found.size() > pageSize;
        List<Message> pageMessages = hasMore ? found.subList(0, pageSize) : found;
        List<MessageDTO> messages = new java.util.ArrayList<>(
                pageMessages.stream().map(MessageDTO::new).toList());
        java.util.Collections.reverse(messages);

        return ResponseEntity.ok(Map.of("messages", messages, "hasMore", hasMore));
    }

    @MessageMapping("/chat.send")
    @Transactional
    public void handleChatMessage(@Payload MessageDTO messageDTO, java.security.Principal principal) {
        if (messageDTO.getSenderId() == null || messageDTO.getReceiverId() == null ||
                messageDTO.getContent() == null || messageDTO.getContent().isBlank() ||
                messageDTO.getContent().length() > MAX_CONTENT_LENGTH) {
            return;
        }

        User sender = userRepository.findById(messageDTO.getSenderId()).orElse(null);
        User receiver = userRepository.findById(messageDTO.getReceiverId()).orElse(null);

        if (sender == null || receiver == null) {
            return;
        }

        if (principal == null || !sender.getEmail().equalsIgnoreCase(principal.getName())) {
            return; // Require an authenticated sender matching the claimed identity
        }

        if (!requestThrottle.tryAcquire("chat:" + sender.getId(), MAX_MESSAGES_PER_WINDOW, MESSAGE_WINDOW)) {
            return; // Flood guard shared with the HTTP endpoint
        }

        boolean connected = connectionRepository.findBySenderOrReceiverAndStatus(sender.getId(), "ACCEPTED")
                .stream()
                .anyMatch(c -> (c.getSender().getId().equals(receiver.getId()) || c.getReceiver().getId().equals(receiver.getId())));
        if (!connected) {
            return; // Not an accepted connection
        }

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(messageDTO.getContent());
        message.setTimestamp(new java.sql.Timestamp(System.currentTimeMillis()));

        Message savedMessage = messageRepository.save(message);
        MessageDTO responseDTO = new MessageDTO(savedMessage);

        String chatId = Math.min(sender.getId(), receiver.getId()) + "-" +
                Math.max(sender.getId(), receiver.getId());
        messagingTemplate.convertAndSend("/topic/messages/" + chatId, responseDTO);
    }

    private Long extractUserIdFromToken(String token) {
        String jwt = token.replace("Bearer ", "");
        Long userId = jwtService.getUserIdFromToken(jwt);
        if (userId == null) {
            throw new IllegalArgumentException("Invalid token: user ID not found");
        }
        return userId;
    }
}
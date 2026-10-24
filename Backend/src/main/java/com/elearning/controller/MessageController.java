package com.elearning.controller;

import com.elearning.models.Message;
import com.elearning.models.User;
import com.elearning.repositories.MessageRepository;
import com.elearning.repositories.UserRepository;
import com.elearning.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private JwtService jwtService;

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

    @Transactional
    @PostMapping("/send")
    public MessageDTO sendMessage(@RequestBody MessageDTO messageDTO, @RequestHeader("Authorization") String token) {
        Long userId = extractUserIdFromToken(token);
        if (!userId.equals(messageDTO.getSenderId())) {
            throw new IllegalArgumentException("Token user ID does not match sender ID");
        }

        User sender = userRepository.findById(messageDTO.getSenderId())
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));
        User receiver = userRepository.findById(messageDTO.getReceiverId())
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));

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

        return responseDTO;
    }

    @Transactional
    @GetMapping("/history/{receiverId}")
    public List<Message> getMessageHistory(@PathVariable Long receiverId, @RequestHeader("Authorization") String token) {
        Long userId = extractUserIdFromToken(token);
        return messageRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(userId, receiverId, userId, receiverId);
    }

    @MessageMapping("/chat.send")
    @Transactional
    public void handleChatMessage(@Payload MessageDTO messageDTO) {
        String chatId = Math.min(messageDTO.getSenderId(), messageDTO.getReceiverId()) + "-" +
                Math.max(messageDTO.getSenderId(), messageDTO.getReceiverId());
        messagingTemplate.convertAndSend("/topic/messages/" + chatId, messageDTO);
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
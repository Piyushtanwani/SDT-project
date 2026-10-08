//package com.elearning.controller;
//
//import com.elearning.models.Message;
//import com.elearning.models.User;
//import com.elearning.repositories.MessageRepository;
//import com.elearning.repositories.UserRepository;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.messaging.handler.annotation.MessageMapping;
//import org.springframework.messaging.handler.annotation.Payload;
//import org.springframework.messaging.simp.SimpMessagingTemplate;
//import org.springframework.stereotype.Controller;
//
//import java.time.LocalDateTime;
//import java.util.Map;
//
//@Controller
//public class WebSocketController {
//
//    private final SimpMessagingTemplate messagingTemplate;
//    private final MessageRepository messageRepository;
//    private final UserRepository userRepository;
//
//    @Autowired
//    public WebSocketController(
//            SimpMessagingTemplate messagingTemplate,
//            MessageRepository messageRepository,
//            UserRepository userRepository) {
//        this.messagingTemplate = messagingTemplate;
//        this.messageRepository = messageRepository;
//        this.userRepository = userRepository;
//    }
//
//    @MessageMapping("/chat.send")
//    public void sendMessage(@Payload Map<String, Object> payload) {
//        try {
//            Long senderId = Long.valueOf(payload.get("senderId").toString());
//            Long receiverId = Long.valueOf(payload.get("receiverId").toString());
//            String content = (String) payload.get("content");
//
//            User sender = userRepository.findById(senderId)
//                    .orElseThrow(() -> new RuntimeException("Sender not found"));
//            User receiver = userRepository.findById(receiverId)
//                    .orElseThrow(() -> new RuntimeException("Receiver not found"));
//
//            Message message = new Message();
//            message.setSender(sender);
//            message.setReceiver(receiver);
//            message.setContent(content);
//            message.setTimestamp(LocalDateTime.now());
//            messageRepository.save(message);
//
//            // Send to both users (chatId is min(senderId, receiverId) + "-" + max(senderId, receiverId))
//            String chatId = Math.min(senderId, receiverId) + "-" + Math.max(senderId, receiverId);
//            messagingTemplate.convertAndSend("/topic/messages/" + chatId, message);
//        } catch (Exception e) {
//            // Log error, but don't interrupt client
//            System.err.println("WebSocket error: " + e.getMessage());
//        }
//    }
//}
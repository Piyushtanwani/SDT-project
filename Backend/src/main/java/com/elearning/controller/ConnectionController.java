//package com.elearning.controller;
//
//import com.elearning.models.Connection;
//import com.elearning.models.User;
//import com.elearning.repositories.ConnectionRepository;
//import com.elearning.repositories.UserRepository;
//import com.elearning.response_request.ApiResponse;
//import com.elearning.response_request.ConnectionRequest;
//import com.elearning.response_request.ConnectionUpdate;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.core.annotation.AuthenticationPrincipal;
//import org.springframework.security.core.userdetails.UserDetails;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//import java.util.stream.Collectors;
//
//@RestController
//@RequestMapping("/api/connections")
//public class ConnectionController {
//
//    @Autowired
//    private ConnectionRepository connectionRepository;
//
//    @Autowired
//    private UserRepository userRepository;
//
//    // Send connection request
//    @PostMapping
//    public ResponseEntity<?> sendConnectionRequest(
//            @RequestBody ConnectionRequest request,
//            @AuthenticationPrincipal UserDetails userDetails
//    ) {
//        try {
//            if (userDetails == null || !userRepository.findById(request.getSenderId())
//                    .map(user -> user.getUsername().equals(userDetails.getUsername()))
//                    .orElse(false)) {
//                return ResponseEntity.status(HttpStatus.FORBIDDEN)
//                        .body(new ApiResponse(false, "Unauthorized to send request"));
//            }
//
//            User sender = userRepository.findById(request.getSenderId())
//                    .orElseThrow(() -> new RuntimeException("Sender not found"));
//            User receiver = userRepository.findById(request.getReceiverId())
//                    .orElseThrow(() -> new RuntimeException("Receiver not found"));
//
//            if (connectionRepository.findBySenderAndReceiver(sender.getId(), receiver.getId()).isPresent()) {
//                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
//                        .body(new ApiResponse(false, "Connection request already exists"));
//            }
//
//            Connection connection = new Connection();
//            connection.setSender(sender);
//            connection.setReceiver(receiver);
//            connection.setStatus("PENDING");
//            connectionRepository.save(connection);
//
//            return ResponseEntity.ok(connection);
//        } catch (RuntimeException e) {
//            return ResponseEntity.status(HttpStatus.NOT_FOUND)
//                    .body(new ApiResponse(false, e.getMessage()));
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                    .body(new ApiResponse(false, "Failed to send request: " + e.getMessage()));
//        }
//    }
//
//    // Get pending requests for a user
//    @GetMapping("/pending/{userId}")
//    public ResponseEntity<?> getPendingRequests(
//            @PathVariable Long userId,
//            @AuthenticationPrincipal UserDetails userDetails
//    ) {
//        try {
//            if (userDetails == null || !userRepository.findById(userId)
//                    .map(user -> user.getUsername().equals(userDetails.getUsername()))
//                    .orElse(false)) {
//                return ResponseEntity.status(HttpStatus.FORBIDDEN)
//                        .body(new ApiResponse(false, "Unauthorized to view requests"));
//            }
//
//            List<Connection> pending = connectionRepository.findByReceiverAndStatus(userId, "PENDING");
//            return ResponseEntity.ok(pending);
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                    .body(new ApiResponse(false, "Failed to fetch pending requests: " + e.getMessage()));
//        }
//    }
//
//    // Get accepted connections for a user
//    @GetMapping("/accepted/{userId}")
//    public ResponseEntity<?> getAcceptedConnections(
//            @PathVariable Long userId,
//            @AuthenticationPrincipal UserDetails userDetails
//    ) {
//        try {
//            if (userDetails == null || !userRepository.findById(userId)
//                    .map(user -> user.getUsername().equals(userDetails.getUsername()))
//                    .orElse(false)) {
//                return ResponseEntity.status(HttpStatus.FORBIDDEN)
//                        .body(new ApiResponse(false, "Unauthorized to view connections"));
//            }
//
//            List<Connection> acceptedConnections = connectionRepository.findAcceptedConnections(userId, "ACCEPTED");
//            List<User> connections = acceptedConnections.stream()
//                    .map(conn -> conn.getSender().getId().equals(userId) ? conn.getReceiver() : conn.getSender())
//                    .map(user -> {
//                        User simplifiedUser = new User();
//                        simplifiedUser.setId(user.getId());
//                        simplifiedUser.setUsername(user.getUsername());
//                        simplifiedUser.setName(user.getName());
//                        simplifiedUser.setProfileurl(user.getProfileurl());
//                        return simplifiedUser;
//                    })
//                    .collect(Collectors.toList());
//
//            return ResponseEntity.ok(connections);
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                    .body(new ApiResponse(false, "Failed to fetch accepted connections: " + e.getMessage()));
//        }
//    }
//
//    // Accept/Reject connection
//    @PutMapping("/{id}")
//    public ResponseEntity<?> updateConnection(
//            @PathVariable Long id,
//            @RequestBody ConnectionUpdate update,
//            @AuthenticationPrincipal UserDetails userDetails
//    ) {
//        try {
//            Connection connection = connectionRepository.findById(id)
//                    .orElseThrow(() -> new RuntimeException("Connection not found"));
//
//            if (userDetails == null || !userRepository.findById(connection.getReceiver().getId())
//                    .map(user -> user.getUsername().equals(userDetails.getUsername()))
//                    .orElse(false)) {
//                return ResponseEntity.status(HttpStatus.FORBIDDEN)
//                        .body(new ApiResponse(false, "Unauthorized to update connection"));
//            }
//
//            if (!update.getStatus().equals("ACCEPTED") && !update.getStatus().equals("REJECTED")) {
//                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
//                        .body(new ApiResponse(false, "Invalid status"));
//            }
//
//            connection.setStatus(update.getStatus());
//            connectionRepository.save(connection);
//
//            return ResponseEntity.ok(connection);
//        } catch (RuntimeException e) {
//            return ResponseEntity.status(HttpStatus.NOT_FOUND)
//                    .body(new ApiResponse(false, e.getMessage()));
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                    .body(new ApiResponse(false, "Failed to update connection: " + e.getMessage()));
//        }
//    }
//}
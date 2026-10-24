package com.elearning.controller;

import com.elearning.models.Connection;
import com.elearning.models.Skill;
import com.elearning.models.User;
import com.elearning.repositories.ConnectionRepository;
import com.elearning.repositories.SkillRepository;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.ApiResponse;
import com.elearning.response_request.ConnectionRequest;
import com.elearning.response_request.ConnectionUpdate;
import com.elearning.response_request.LoginRequest;
import com.elearning.response_request.LoginResponse;
import com.elearning.response_request.OtpVerificationRequest;
import com.elearning.response_request.UserUpdateDTO;
import com.elearning.security.JwtService;
import com.elearning.services.CustomUserDetailsService;
import com.elearning.services.EmailService;
import com.elearning.services.OtpService;
import com.elearning.services.RegistrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final RegistrationService registrationService;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final EmailService emailService;
    private final OtpService otpService;
    private final SkillRepository skillRepository;
    private final ConnectionRepository connectionRepository;

    @Autowired
    public AuthController(
            RegistrationService registrationService,
            UserRepository userRepository,
            JwtService jwtService,
            EmailService emailService,
            OtpService otpService,
            CustomUserDetailsService userDetailsService,
            SkillRepository skillRepository,
            ConnectionRepository connectionRepository) {
        this.registrationService = registrationService;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.emailService = emailService;
        this.otpService = otpService;
        this.skillRepository = skillRepository;
        this.connectionRepository = connectionRepository;
    }

    

        @PutMapping("/update/{id}")
        public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody UserUpdateDTO updatedUser) {
            try {
                Long parsedId;
                try {
                    parsedId = Long.valueOf(id);
                } catch (NumberFormatException e) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse(false, "Invalid user ID: " + id));
                }
                User existingUser = userRepository.findById(parsedId)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found with ID: " + parsedId));

                // Update basic fields
                if (updatedUser.getUsername() != null) existingUser.setUsername(updatedUser.getUsername());
                if (updatedUser.getName() != null) existingUser.setName(updatedUser.getName());
                if (updatedUser.getProfileurl() != null) existingUser.setProfileurl(updatedUser.getProfileurl());
                if (updatedUser.getPhonenum() != null) existingUser.setPhonenum(updatedUser.getPhonenum());
                if (updatedUser.getState() != null) existingUser.setState(updatedUser.getState());
                if (updatedUser.getPassword() != null) existingUser.setPassword(updatedUser.getPassword());
                if (updatedUser.getBio() != null) existingUser.setBio(updatedUser.getBio());
                if (updatedUser.getRole() != null) existingUser.setRole(updatedUser.getRole());
                if (updatedUser.getTimezone() != null) existingUser.setTimezone(updatedUser.getTimezone());
                if (updatedUser.getAvailability() != null) existingUser.setAvailability(updatedUser.getAvailability());

                // Update skills
                List<Skill> updatedSkills = new ArrayList<>();
                if (updatedUser.getSkillIds() != null && !updatedUser.getSkillIds().isEmpty()) {
                    List<Skill> foundSkills = skillRepository.findAllById(updatedUser.getSkillIds());
                    if (foundSkills.size() != updatedUser.getSkillIds().size()) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(new ApiResponse(false, "One or more skill IDs are invalid"));
                    }
                    updatedSkills.addAll(foundSkills);
                }
                existingUser.setSkills(updatedSkills); // Updates the user_skills join table

                userRepository.save(existingUser);
                return ResponseEntity.ok(new ApiResponse(true, "User updated successfully."));
            } catch (UsernameNotFoundException e) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse(false, e.getMessage()));
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse(false, "Update failed: " + e.getMessage()));
            }
        }
    

    

    @PostMapping("/google-auth")
    public ResponseEntity<?> googleAuth(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String name = request.get("name");
            String picture = request.get("picture");
            String password = "Google";
            String username = name;

            if (email == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("success", false, "message", "Google OAuth failed: Email is missing."));
            }

            Optional<User> existingUser = userRepository.findByEmail(email);
            User user;

            if (existingUser.isPresent()) {
                user = existingUser.get();
            } else {
                user = new User();
                user.setEmail(email);
                user.setName(name != null ? name : "Google User");
                user.setProfileurl(picture != null ? picture : "https://webcrumbs.cloud/placeholder");
                user.setUsername(email.split("@")[0]);
                user.setPassword(password);
                user.setRole("USER");
                user.setEnabled(true);
                userRepository.save(user);
            }

            String jwtToken = jwtService.generateToken(user.getEmail(), user.getId());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Google login successful",
                    "token", jwtToken,
                    "username", user.getUsername(),
                    "email", user.getEmail(),
                    "profileurl", user.getProfileurl(),
                    "userid", user.getId(),
                    "name", user.getName(),
                    "role",user.getRole()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Google OAuth failed: " + e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@RequestBody User user) {
        try {
            if (!registrationService.validUser(user)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Registration failed: Email or Username Already Exist");
            }
            registrationService.registerUser(user);
            return ResponseEntity.ok("User registered. Check your email for OTP.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Registration failed: " + e.getMessage());
        }
    }

    @PostMapping("/resend-otp/{email}")
    public ResponseEntity<String> resendOtp(@PathVariable String email) {
        String otp = otpService.generateOtp();
        LocalDateTime otpExpiry = otpService.getOtpExpiryTime();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
        }
        user.setOtp(otp);
        user.setOtpExpiry(otpExpiry);
        userRepository.save(user);
        new Thread(() -> emailService.sendOtpEmail(email, otp)).start();
        return ResponseEntity.status(HttpStatus.OK).body("OTP Sent Successfully");
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse> verifyOtp(@RequestBody OtpVerificationRequest request) {
        boolean verified = registrationService.verifyOtp(request.getEmail(), request.getOtp());
        if (verified) {
            return ResponseEntity.ok(new ApiResponse(true, "Email verified!"));
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Invalid or expired OTP."));
        }
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<?> getUser(@PathVariable String id) {
        try {
            Long parsedId;
            try {
                parsedId = Long.valueOf(id);
            } catch (NumberFormatException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Invalid user ID: " + id));
            }
            User user = userRepository.findById(parsedId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with Id: " + parsedId));
            return ResponseEntity.ok(user);
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to fetch user: " + e.getMessage()));
        }
    }

    @GetMapping("/getUsername/{id}")
    public ResponseEntity<?> getUsernameById(@PathVariable String id) {
        try {
            Long parsedId;
            try {
                parsedId = Long.valueOf(id);
            } catch (NumberFormatException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Invalid user ID: " + id));
            }
            User user = userRepository.findById(parsedId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with Id: " + parsedId));
            return ResponseEntity.ok(user.getUsername());
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to fetch username: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        String email = loginRequest.getEmail();
        String password = loginRequest.getPassword();

        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

            if (password.equals(user.getPassword())) {
                String token = jwtService.generateToken(user.getEmail(), user.getId());
                String username = user.getUsername();
                String phonenum = (user.getPhonenum() != null) ? user.getPhonenum() : "";
                String state = (user.getState() != null) ? user.getState() : "";
                Long userid = (user.getId() != null) ? user.getId() : 0;
                String profileurl = (user.getProfileurl() != null) ? user.getProfileurl() : "";
                String name = (user.getName() != null) ? user.getName() : "";
                String role = (user.getRole() != null) ? user.getRole() : "USER";
                LoginResponse response = new LoginResponse(true, token, username, email, phonenum, state, userid, profileurl, name, role);
                return ResponseEntity.ok(response);
            }

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Invalid email or password."));
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Login failed: " + e.getMessage()));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<User> users = userRepository.findAll();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to fetch users: " + e.getMessage()));
        }
    }

    @GetMapping("/filter")
    public ResponseEntity<?> filterUsers(
            @RequestParam(required = false) List<String> skills,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String timezone) {
        try {
            List<User> users = userRepository.findByFilters(
                    skills != null ? skills : Collections.emptyList(),
                    role,
                    timezone);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to filter users: " + e.getMessage()));
        }
    }

    @PostMapping("/connect")
    public ResponseEntity<?> sendConnectionRequest(@RequestBody ConnectionRequest request) {
        try {
            User sender = userRepository.findById(request.getSenderId())
                    .orElseThrow(() -> new UsernameNotFoundException("Sender not found."));
            User receiver = userRepository.findById(request.getReceiverId())
                    .orElseThrow(() -> new UsernameNotFoundException("Receiver not found."));

            // Prevent self-connection
            if (sender.getId().equals(receiver.getId())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Cannot connect with yourself."));
            }

            // Check for existing connection
            List<Connection> existingConnections = connectionRepository.findBySenderOrReceiverAndStatus(
                    sender.getId(), "PENDING");
            existingConnections.addAll(connectionRepository.findBySenderOrReceiverAndStatus(
                    sender.getId(), "ACCEPTED"));
            if (existingConnections.stream().anyMatch(c ->
                    (c.getSender().getId().equals(sender.getId()) && c.getReceiver().getId().equals(receiver.getId())) ||
                            (c.getSender().getId().equals(receiver.getId()) && c.getReceiver().getId().equals(sender.getId())))) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Connection already exists."));
            }

            Connection connection = new Connection();
            connection.setSender(sender);
            connection.setReceiver(receiver);
            connection.setStatus("PENDING");
            connectionRepository.save(connection);
            return ResponseEntity.ok(new ApiResponse(true, "Connection request sent."));
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to send request: " + e.getMessage()));
        }
    }

    @GetMapping("/pending/{userId}")
    public ResponseEntity<?> getPendingRequests(@PathVariable Long userId) {
        try {
            List<Connection> requests = connectionRepository.findByReceiverAndStatus(userId, "PENDING");
            List<Map<String, Object>> response = new ArrayList<>();
            Set<Long> seenUserIds = new HashSet<>();
            for (Connection c : requests) {
                User sender = c.getSender();
                if (seenUserIds.contains(sender.getId())) {
                    continue; // Skip duplicates
                }
                seenUserIds.add(sender.getId());
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("connectionId", c.getId());
                userMap.put("id", sender.getId());
                userMap.put("username", sender.getUsername());
                userMap.put("email", sender.getEmail());
                userMap.put("phonenum", sender.getPhonenum() != null ? sender.getPhonenum() : "");
                userMap.put("state", sender.getState() != null ? sender.getState() : "");
                userMap.put("name", sender.getName() != null ? sender.getName() : "");
                userMap.put("profileurl", sender.getProfileurl() != null ? sender.getProfileurl() : "");
                userMap.put("bio", sender.getBio() != null ? sender.getBio() : "");
                userMap.put("timezone", sender.getTimezone() != null ? sender.getTimezone() : "");
                userMap.put("availability", sender.getAvailability() != null ? sender.getAvailability() : "");
                userMap.put("skills", sender.getSkills().stream().map(Skill::getName).collect(Collectors.toList()));
                response.add(userMap);
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to fetch requests: " + e.getMessage()));
        }
    }

    @PutMapping("/connect/{id}")
    public ResponseEntity<?> updateConnection(@PathVariable Long id, @RequestBody ConnectionUpdate update) {
        try {
            Connection connection = connectionRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Connection not found."));
            if (!connection.getStatus().equals("PENDING")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Connection is not pending."));
            }
            String status = update.getStatus().toUpperCase();
            if (!status.equals("ACCEPTED") && !status.equals("REJECTED")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Invalid status."));
            }
            connection.setStatus(status);
            connectionRepository.save(connection);
            return ResponseEntity.ok(new ApiResponse(true, "Connection " + status.toLowerCase() + "."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to update connection: " + e.getMessage()));
        }
    }

    @GetMapping("/connections/{userId}")
    public ResponseEntity<?> getAcceptedConnections(@PathVariable Long userId) {
        try {
            List<Connection> connections = connectionRepository.findBySenderOrReceiverAndStatus(userId, "ACCEPTED");
            List<Map<String, Object>> response = new ArrayList<>();
            Set<Long> seenUserIds = new HashSet<>();
            for (Connection c : connections) {
                User otherUser = c.getSender().getId().equals(userId) ? c.getReceiver() : c.getSender();
                if (seenUserIds.contains(otherUser.getId())) {
                    continue; // Skip duplicates
                }
                seenUserIds.add(otherUser.getId());
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", otherUser.getId());
                userMap.put("username", otherUser.getUsername());
                userMap.put("email", otherUser.getEmail());
                userMap.put("phonenum", otherUser.getPhonenum() != null ? otherUser.getPhonenum() : "");
                userMap.put("state", otherUser.getState() != null ? otherUser.getState() : "");
                userMap.put("name", otherUser.getName() != null ? otherUser.getName() : "");
                userMap.put("profileurl", otherUser.getProfileurl() != null ? otherUser.getProfileurl() : "");
                userMap.put("bio", otherUser.getBio() != null ? otherUser.getBio() : "");
                userMap.put("timezone", otherUser.getTimezone() != null ? otherUser.getTimezone() : "");
                userMap.put("availability", otherUser.getAvailability() != null ? otherUser.getAvailability() : "");
                userMap.put("skills", otherUser.getSkills().stream().map(Skill::getName).collect(Collectors.toList()));
                response.add(userMap);
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to fetch connections: " + e.getMessage()));
        }
    }

    @GetMapping("/skills")
    public ResponseEntity<List<Skill>> getSkills() {
        return ResponseEntity.ok(skillRepository.findAll());
    }
}
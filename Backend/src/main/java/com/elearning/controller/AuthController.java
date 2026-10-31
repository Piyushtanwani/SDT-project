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
import com.elearning.response_request.PublicUserDTO;
import com.elearning.response_request.UserUpdateDTO;
import com.elearning.security.JwtService;
import com.elearning.services.CustomUserDetailsService;
import com.elearning.services.EmailService;
import com.elearning.services.OtpService;
import com.elearning.services.RegistrationService;
import com.elearning.services.RequestThrottle;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
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
    private final PasswordEncoder passwordEncoder;
    private final RequestThrottle requestThrottle;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Autowired
    public AuthController(
            RegistrationService registrationService,
            UserRepository userRepository,
            JwtService jwtService,
            EmailService emailService,
            OtpService otpService,
            CustomUserDetailsService userDetailsService,
            SkillRepository skillRepository,
            ConnectionRepository connectionRepository,
            PasswordEncoder passwordEncoder,
            RequestThrottle requestThrottle) {
        this.registrationService = registrationService;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.emailService = emailService;
        this.otpService = otpService;
        this.skillRepository = skillRepository;
        this.connectionRepository = connectionRepository;
        this.passwordEncoder = passwordEncoder;
        this.requestThrottle = requestThrottle;
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

            // SEC-03: Ensure caller is authorized (either account owner or ADMIN)
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse(false, "Authentication required."));
            }
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            String currentEmail = auth.getName();
            if (!isAdmin && !existingUser.getEmail().equalsIgnoreCase(currentEmail)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ApiResponse(false, "You are not authorized to update another user's profile."));
            }

            // Update basic fields
            if (updatedUser.getUsername() != null) {
                String username = updatedUser.getUsername().trim();
                if (username.isEmpty()) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse(false, "Username cannot be empty."));
                }
                Optional<User> holder = userRepository.findByUsernameIgnoreCase(username);
                if (holder.isPresent() && !holder.get().getId().equals(existingUser.getId())) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse(false, "Username is already in use."));
                }
                existingUser.setUsername(username);
            }
            if (updatedUser.getName() != null) existingUser.setName(updatedUser.getName());
            if (updatedUser.getProfileurl() != null) existingUser.setProfileurl(updatedUser.getProfileurl());
            if (updatedUser.getPhonenum() != null) {
                String phone = updatedUser.getPhonenum().trim();
                if (phone.isEmpty()) {
                    existingUser.setPhonenum(null);
                } else {
                    if (!phone.matches("^[0-9]{10,15}$")) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(new ApiResponse(false, "Phone number must be 10 to 15 digits."));
                    }
                    Optional<User> phoneHolder = userRepository.findByPhonenum(phone);
                    if (phoneHolder.isPresent() && !phoneHolder.get().getId().equals(existingUser.getId())) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(new ApiResponse(false, "Phone number is already in use."));
                    }
                    existingUser.setPhonenum(phone);
                }
            }
            if (updatedUser.getState() != null) existingUser.setState(updatedUser.getState());
            if (updatedUser.getBio() != null) existingUser.setBio(updatedUser.getBio());
            if (updatedUser.getTimezone() != null) existingUser.setTimezone(updatedUser.getTimezone());
            if (updatedUser.getAvailability() != null) existingUser.setAvailability(updatedUser.getAvailability());

            // Password hashing
            if (updatedUser.getPassword() != null && !updatedUser.getPassword().isBlank()) {
                existingUser.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
            }

            // Only ADMIN can change role
            if (isAdmin && updatedUser.getRole() != null && !updatedUser.getRole().isBlank()) {
                String role = updatedUser.getRole().trim().toUpperCase();
                if (role.startsWith("ROLE_")) {
                    role = role.substring(5);
                }
                if (!role.equals("USER") && !role.equals("ADMIN")) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse(false, "Role must be USER or ADMIN."));
                }
                existingUser.setRole(role);
            }

            // Update skills only when the client sends the field; omitting it must not erase them
            if (updatedUser.getSkillIds() != null) {
                List<Skill> updatedSkills = new ArrayList<>();
                if (!updatedUser.getSkillIds().isEmpty()) {
                    List<Skill> foundSkills = skillRepository.findAllById(updatedUser.getSkillIds());
                    if (foundSkills.size() != updatedUser.getSkillIds().size()) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(new ApiResponse(false, "One or more skill IDs are invalid"));
                    }
                    updatedSkills.addAll(foundSkills);
                }
                existingUser.setSkills(updatedSkills);
            }

            userRepository.save(existingUser);
            return ResponseEntity.ok(new ApiResponse(true, "User updated successfully."));
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            System.err.println("Profile update failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Update failed. Please try again."));
        }
    }

    @PostMapping("/google-auth")
    public ResponseEntity<?> googleAuth(@RequestBody Map<String, String> request) {
        try {
            String idTokenString = request.get("credential");
            if (idTokenString == null || idTokenString.isBlank()) {
                idTokenString = request.get("token");
            }

            String email = null;
            String name = null;
            String picture = null;

            if (googleClientId == null || googleClientId.isBlank()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(Map.of("success", false, "message", "Google sign-in is not configured on this server."));
            }

            if (idTokenString != null && !idTokenString.isBlank()) {
                try {
                    GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                            new NetHttpTransport(),
                            GsonFactory.getDefaultInstance())
                            .setAudience(Collections.singletonList(googleClientId))
                            .build();

                    GoogleIdToken idToken = verifier.verify(idTokenString);
                    if (idToken != null) {
                        Payload payload = idToken.getPayload();
                        Boolean emailVerified = Boolean.valueOf(payload.getEmailVerified());
                        if (emailVerified != null && emailVerified) {
                            email = payload.getEmail();
                            name = (String) payload.get("name");
                            picture = (String) payload.get("picture");
                        }
                    }
                } catch (Exception e) {
                    // Verifier error (e.g. offline testing or network issue)
                }
            }

            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Google OAuth failed: Invalid or unverified Google token."));
            }

            Optional<User> existingUser = userRepository.findByEmailIgnoreCase(email);
            User user;

            if (existingUser.isPresent()) {
                user = existingUser.get();
                if (picture != null && (user.getProfileurl() == null || user.getProfileurl().isBlank())) {
                    user.setProfileurl(picture);
                }
                if (name != null && (user.getName() == null || user.getName().isBlank())) {
                    user.setName(name);
                }
            } else {
                user = new User();
                user.setEmail(email);
                user.setName(name != null ? name : "Google User");
                user.setProfileurl(picture != null ? picture : "https://webcrumbs.cloud/placeholder");
                user.setUsername(email.split("@")[0]);
                user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                user.setRole("USER");
                user.setEnabled(true);
            }
            userRepository.save(user);

            String jwtToken = jwtService.generateToken(user.getEmail(), user.getId());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Google login successful",
                    "token", jwtToken,
                    "username", user.getUsername() != null ? user.getUsername() : "",
                    "email", user.getEmail(),
                    "profileurl", user.getProfileurl() != null ? user.getProfileurl() : "",
                    "userid", user.getId(),
                    "name", user.getName() != null ? user.getName() : "",
                    "role", user.getRole() != null ? user.getRole() : "USER"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Google OAuth failed: " + e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@Valid @RequestBody User user) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Registration failed: Email is required.");
        }
        if (user.getUsername() == null || user.getUsername().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Registration failed: Username is required.");
        }
        if (user.getPassword() == null || user.getPassword().length() < 6) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Registration failed: Password must be at least 6 characters.");
        }
        if (user.getPassword().length() > 72) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Registration failed: Password must be at most 72 characters.");
        }
        try {
            if (!registrationService.validUser(user)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Registration failed: Email, username or phone number is already in use.");
            }
            registrationService.registerUser(user);
            return ResponseEntity.ok("User registered. Check your email for OTP.");
        } catch (Exception e) {
            System.err.println("Registration failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Registration failed. Please review your details and try again.");
        }
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<String> handleInvalidRegistration(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .findFirst()
                .orElse("Invalid registration details.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Registration failed: " + detail);
    }

    @PostMapping("/resend-otp/{email}")
    public ResponseEntity<String> resendOtp(@PathVariable String email) {
        String throttleKey = "resend-otp:" + email.trim().toLowerCase();
        if (requestThrottle.isBlocked(throttleKey, 5, Duration.ofMinutes(15))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Too many verification code requests. Please try again later.");
        }
        requestThrottle.hit(throttleKey, Duration.ofMinutes(15));

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        // Do not reveal whether an account exists or is already verified.
        if (user != null && !user.isEnabled()) {
            registrationService.resetOtpAttempts(email);
            String otp = otpService.generateOtp();
            user.setOtp(otp);
            user.setOtpExpiry(otpService.getOtpExpiryTime());
            userRepository.save(user);
            new Thread(() -> emailService.sendOtpEmail(email, otp)).start();
        }
        return ResponseEntity.status(HttpStatus.OK)
                .body("If this email belongs to an unverified account, a new OTP has been sent.");
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse> verifyOtp(@RequestBody OtpVerificationRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getOtp() == null || request.getOtp().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Invalid or expired OTP."));
        }
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
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean self = auth != null && user.getEmail().equalsIgnoreCase(auth.getName());
            boolean isAdmin = auth != null && auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            return ResponseEntity.ok(self || isAdmin ? user : PublicUserDTO.from(user));
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
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        String email = loginRequest.getEmail();
        String password = loginRequest.getPassword();

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Invalid email or password."));
        }

        String throttleKey = "login:" + email.trim().toLowerCase() + "|" + request.getRemoteAddr();
        if (requestThrottle.isBlocked(throttleKey, 10, Duration.ofMinutes(15))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ApiResponse(false, "Too many sign-in attempts. Please try again in a few minutes."));
        }

        try {
            User user = userRepository.findByEmailIgnoreCase(email.trim())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

            boolean matches = passwordEncoder.matches(password, user.getPassword());
            if (!matches) {
                requestThrottle.hit(throttleKey, Duration.ofMinutes(15));
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse(false, "Invalid email or password."));
            }
            requestThrottle.reset(throttleKey);

            if (!user.isEnabled()) {
                boolean awaitingVerification = user.getOtp() != null && !user.getOtp().isBlank();
                String message = awaitingVerification
                        ? "Account email is not verified. Please verify your OTP."
                        : "This account has been disabled. Please contact support.";
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ApiResponse(false, message));
            }

            String token = jwtService.generateToken(user.getEmail(), user.getId());
            String username = user.getUsername() != null ? user.getUsername() : "";
            String phonenum = (user.getPhonenum() != null) ? user.getPhonenum() : "";
            String state = (user.getState() != null) ? user.getState() : "";
            Long userid = (user.getId() != null) ? user.getId() : 0L;
            String profileurl = (user.getProfileurl() != null) ? user.getProfileurl() : "";
            String name = (user.getName() != null) ? user.getName() : "";
            String role = (user.getRole() != null) ? user.getRole() : "USER";
            LoginResponse response = new LoginResponse(true, token, username, email, phonenum, state, userid, profileurl, name, role);
            return ResponseEntity.ok(response);
        } catch (UsernameNotFoundException e) {
            requestThrottle.hit(throttleKey, Duration.ofMinutes(15));
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Invalid email or password."));
        } catch (Exception e) {
            System.err.println("Login failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Login failed. Please try again."));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<PublicUserDTO> users = userRepository.findByEnabledTrue().stream()
                    .map(PublicUserDTO::from)
                    .toList();
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
            boolean skillsEmpty = (skills == null || skills.isEmpty());
            List<PublicUserDTO> users = userRepository.findByFilters(
                            skillsEmpty ? Collections.singletonList("") : skills,
                            skillsEmpty,
                            role,
                            timezone)
                    .stream()
                    .map(PublicUserDTO::from)
                    .toList();
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

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse(false, "Authentication required."));
            }
            if (!sender.getEmail().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ApiResponse(false, "Cannot send connection request on behalf of another user."));
            }

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

    @GetMapping("/connection-status/{userId}")
    public ResponseEntity<?> getConnectionStatuses(@PathVariable Long userId) {
        try {
            User target = userRepository.findById(userId).orElse(null);
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (target == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse(false, "User not found."));
            }
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse(false, "Authentication required."));
            }
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin && !target.getEmail().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ApiResponse(false, "You can only view your own connection statuses."));
            }

            Map<String, Object> statuses = new HashMap<>();
            for (Connection c : connectionRepository.findBySenderOrReceiverAndStatus(userId, "ACCEPTED")) {
                Long otherId = c.getSender().getId().equals(userId)
                        ? c.getReceiver().getId()
                        : c.getSender().getId();
                statuses.put(String.valueOf(otherId), Map.of("status", "CONNECTED"));
            }
            for (Connection c : connectionRepository.findBySenderOrReceiverAndStatus(userId, "PENDING")) {
                boolean outgoing = c.getSender().getId().equals(userId);
                Long otherId = outgoing ? c.getReceiver().getId() : c.getSender().getId();
                String key = String.valueOf(otherId);
                if (statuses.containsKey(key)) {
                    continue;
                }
                Map<String, Object> entry = new HashMap<>();
                entry.put("status", outgoing ? "PENDING_SENT" : "PENDING_RECEIVED");
                entry.put("connectionId", c.getId());
                statuses.put(key, entry);
            }
            return ResponseEntity.ok(Map.of("statuses", statuses));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to fetch connection statuses: " + e.getMessage()));
        }
    }

    @GetMapping("/pending/{userId}")
    public ResponseEntity<?> getPendingRequests(@PathVariable Long userId) {
        try {
            User target = userRepository.findById(userId).orElse(null);
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (target != null && auth != null && !target.getEmail().equalsIgnoreCase(auth.getName())) {
                boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                if (!isAdmin) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(new ApiResponse(false, "Unauthorized to view pending requests for another user."));
                }
            }

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
                userMap.put("name", sender.getName() != null ? sender.getName() : "");
                userMap.put("role", sender.getRole() != null ? sender.getRole() : "");
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

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse(false, "Authentication required."));
            }
            if (!connection.getReceiver().getEmail().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ApiResponse(false, "Only the designated recipient can accept or reject this connection."));
            }

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
            User target = userRepository.findById(userId).orElse(null);
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (target == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse(false, "User not found."));
            }
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse(false, "Authentication required."));
            }
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin && !target.getEmail().equalsIgnoreCase(auth.getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ApiResponse(false, "You can only view your own connections."));
            }

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
                userMap.put("name", otherUser.getName() != null ? otherUser.getName() : "");
                userMap.put("role", otherUser.getRole() != null ? otherUser.getRole() : "");
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
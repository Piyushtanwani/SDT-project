package com.elearning.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.elearning.models.User;
import com.elearning.repositories.UserRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RegistrationService {

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private static final int MAX_OTP_ATTEMPTS = 5;
    private final Map<String, Integer> failedOtpAttempts = new ConcurrentHashMap<>();

    @Autowired
    public RegistrationService(
            UserRepository userRepository,
            OtpService otpService,
            EmailService emailService,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.otpService = otpService;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    public boolean validUser(User user) {
        if (user.getEmail() == null || user.getUsername() == null) {
            return false;
        }
        User existingEmail = userRepository.findByEmailIgnoreCase(user.getEmail().trim()).orElse(null);
        User existingUserName = userRepository.findByUsernameIgnoreCase(user.getUsername().trim()).orElse(null);

        // A username or phone number belongs to at most one account, regardless of whether
        // that account has verified its email yet.
        if (existingUserName != null && !sameAccount(existingEmail, existingUserName)) {
            return false;
        }
        if (user.getPhonenum() != null && !user.getPhonenum().isBlank()) {
            User existingPhone = userRepository.findByPhonenum(user.getPhonenum().trim()).orElse(null);
            if (existingPhone != null && !sameAccount(existingEmail, existingPhone)) {
                return false;
            }
        }

        return existingEmail == null || !existingEmail.isEnabled();
    }

    private static boolean sameAccount(User emailOwner, User other) {
        return emailOwner != null && other != null && emailOwner.getId() != null
                && emailOwner.getId().equals(other.getId());
    }

    public void registerUser(User user) {
        Optional<User> existingUserOptional = userRepository.findByEmailIgnoreCase(user.getEmail().trim());
        user.setEmail(user.getEmail().trim());
        if (user.getUsername() != null) {
            user.setUsername(user.getUsername().trim());
        }
        if (user.getPhonenum() != null) {
            String phone = user.getPhonenum().trim();
            user.setPhonenum(phone.isEmpty() ? null : phone);
        }
        resetOtpAttempts(user.getEmail());

        String otp = otpService.generateOtp();
        LocalDateTime otpExpiry = otpService.getOtpExpiryTime();
        user.setName(user.getUsername());
        if (user.getProfileurl() == null || user.getProfileurl().isBlank()) {
            user.setProfileurl("https://webcrumbs.cloud/placeholder");
        }

        // Always force safe default role for registration
        user.setRole("USER");
        user.setEnabled(false);
        user.setOtp(otp);
        user.setOtpExpiry(otpExpiry);

        // Secure password hashing
        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }

        if (existingUserOptional.isPresent()) {
            User existingUser = existingUserOptional.get();
            existingUser.setOtp(otp);
            existingUser.setOtpExpiry(otpExpiry);
            if (user.getPassword() != null && !user.getPassword().isBlank()) {
                existingUser.setPassword(user.getPassword());
            }
            userRepository.save(existingUser);
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.sendOtpEmail(existingUser.getEmail(), otp);
                } catch (Exception e) {
                    System.err.println("Async email failed: " + e.getMessage());
                }
            });
        } else {
            userRepository.save(user);
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.sendOtpEmail(user.getEmail(), otp);
                } catch (Exception e) {
                    System.err.println("Async email failed: " + e.getMessage());
                }
            });
        }
    }

    public boolean verifyOtp(String email, String otp) {
        if (email == null || otp == null) {
            return false;
        }
        String attemptKey = email.trim().toLowerCase();
        if (failedOtpAttempts.getOrDefault(attemptKey, 0) >= MAX_OTP_ATTEMPTS) {
            return false;
        }

        User user = userRepository.findByEmailIgnoreCase(email.trim()).orElse(null);
        boolean matches = user != null
                && user.getOtp() != null
                && MessageDigest.isEqual(
                        user.getOtp().getBytes(StandardCharsets.UTF_8),
                        otp.trim().getBytes(StandardCharsets.UTF_8))
                && user.getOtpExpiry() != null
                && user.getOtpExpiry().isAfter(LocalDateTime.now());

        if (!matches) {
            failedOtpAttempts.merge(attemptKey, 1, Integer::sum);
            return false;
        }

        failedOtpAttempts.remove(attemptKey);
        user.setEnabled(true);
        user.setOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        CompletableFuture.runAsync(() -> {
            try {
                sendRegistrationSuccessEmail(user.getEmail());
            } catch (Exception e) {
                System.err.println("Async success email failed: " + e.getMessage());
            }
        });
        return true;
    }

    public void resetOtpAttempts(String email) {
        if (email != null) {
            failedOtpAttempts.remove(email.trim().toLowerCase());
        }
    }

    private void sendRegistrationSuccessEmail(String email) {
        String subject = "Welcome to Learn Without Limits!";
        String message = """
                Dear User,

                Thank you for completing your registration with Learn Without Limits!

                Your account is now activated. You can log in using your registered credentials.

                Happy Learning,
                The Learn Without Limits Team
                """;

        emailService.sendEmail(email, subject, message);
    }
}

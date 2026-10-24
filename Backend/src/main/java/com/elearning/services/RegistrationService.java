package com.elearning.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.elearning.models.User;
import com.elearning.repositories.UserRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
public class RegistrationService {

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

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
        User existingEmail = userRepository.findByEmail(user.getEmail()).orElse(null);
        User existingUserName = userRepository.findByUsername(user.getUsername()).orElse(null);
        if (existingEmail == null && existingUserName == null) {
            return true;
        }

        if ((existingEmail != null && !existingEmail.isEnabled()) || (existingUserName != null && !existingUserName.isEnabled())) {
            return true;
        }

        return false;
    }

    public void registerUser(User user) {
        Optional<User> existingUserOptional = userRepository.findByEmail(user.getEmail());

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
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getOtp() != null && user.getOtp().equals(otp) &&
                user.getOtpExpiry() != null && user.getOtpExpiry().isAfter(LocalDateTime.now())) {
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
        return false;
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

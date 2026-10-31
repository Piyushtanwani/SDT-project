package com.elearning;

import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import com.elearning.services.EmailService;
import com.elearning.services.OtpService;
import com.elearning.services.RegistrationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RegistrationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JavaMailSender mailSender;

    private RegistrationService registrationService;

    @BeforeEach
    void setUp() {
        EmailService emailService = new EmailService(mailSender, "no-reply@example.com", true);
        registrationService = new RegistrationService(
                userRepository, new OtpService(), emailService, new BCryptPasswordEncoder());
    }

    private User pendingUser(String email, String otp, LocalDateTime expiry) {
        User user = new User();
        user.setEmail(email);
        user.setUsername("learner");
        user.setOtp(otp);
        user.setOtpExpiry(expiry);
        user.setEnabled(false);
        return user;
    }

    @Test
    void unknownEmailFailsWithoutThrowing() {
        when(userRepository.findByEmailIgnoreCase("ghost@example.com")).thenReturn(Optional.empty());

        assertFalse(registrationService.verifyOtp("ghost@example.com", "123456"));
    }

    @Test
    void correctOtpEnablesAccountIgnoringEmailCase() {
        User user = pendingUser("learner@example.com", "123456", LocalDateTime.now().plusMinutes(5));
        when(userRepository.findByEmailIgnoreCase("Learner@Example.com")).thenReturn(Optional.of(user));

        assertTrue(registrationService.verifyOtp("Learner@Example.com", "123456"));

        assertTrue(user.isEnabled());
        assertNull(user.getOtp());
        assertNull(user.getOtpExpiry());
        verify(userRepository).save(user);
    }

    @Test
    void otpCannotBeReused() {
        User user = pendingUser("learner@example.com", "123456", LocalDateTime.now().plusMinutes(5));
        when(userRepository.findByEmailIgnoreCase("learner@example.com")).thenReturn(Optional.of(user));

        assertTrue(registrationService.verifyOtp("learner@example.com", "123456"));
        assertFalse(registrationService.verifyOtp("learner@example.com", "123456"));
    }

    @Test
    void expiredOtpIsRejected() {
        User user = pendingUser("learner@example.com", "123456", LocalDateTime.now().minusMinutes(1));
        when(userRepository.findByEmailIgnoreCase("learner@example.com")).thenReturn(Optional.of(user));

        assertFalse(registrationService.verifyOtp("learner@example.com", "123456"));
        assertFalse(user.isEnabled());
    }

    @Test
    void usernameHeldByAnotherPendingAccountIsRejected() {
        User other = pendingUser("other@example.com", "654321", LocalDateTime.now().plusMinutes(5));
        other.setId(99L);
        User candidate = new User();
        candidate.setEmail("new@example.com");
        candidate.setUsername("learner");
        when(userRepository.findByEmailIgnoreCase("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("learner")).thenReturn(Optional.of(other));

        assertFalse(registrationService.validUser(candidate));
    }

    @Test
    void phoneHeldByAnotherAccountIsRejected() {
        User other = pendingUser("other@example.com", "654321", LocalDateTime.now().plusMinutes(5));
        other.setId(99L);
        other.setPhonenum("9876543210");
        User candidate = new User();
        candidate.setEmail("new@example.com");
        candidate.setUsername("newlearner");
        candidate.setPhonenum("9876543210");
        when(userRepository.findByEmailIgnoreCase("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("newlearner")).thenReturn(Optional.empty());
        when(userRepository.findByPhonenum("9876543210")).thenReturn(Optional.of(other));

        assertFalse(registrationService.validUser(candidate));
    }

    @Test
    void unverifiedAccountCanRegisterAgainWithItsOwnUsername() {
        User pending = pendingUser("learner@example.com", "123456", LocalDateTime.now().plusMinutes(5));
        pending.setId(5L);
        User candidate = new User();
        candidate.setEmail("learner@example.com");
        candidate.setUsername("learner");
        when(userRepository.findByEmailIgnoreCase("learner@example.com")).thenReturn(Optional.of(pending));
        when(userRepository.findByUsernameIgnoreCase("learner")).thenReturn(Optional.of(pending));

        assertTrue(registrationService.validUser(candidate));
    }

    @Test
    void verifiedAccountCannotRegisterAgain() {
        User active = pendingUser("learner@example.com", null, null);
        active.setId(5L);
        active.setEnabled(true);
        User candidate = new User();
        candidate.setEmail("learner@example.com");
        candidate.setUsername("learner");
        when(userRepository.findByEmailIgnoreCase("learner@example.com")).thenReturn(Optional.of(active));
        when(userRepository.findByUsernameIgnoreCase("learner")).thenReturn(Optional.of(active));

        assertFalse(registrationService.validUser(candidate));
    }

    @Test
    void fiveWrongAttemptsLockOutUntilReset() {
        User user = pendingUser("learner@example.com", "123456", LocalDateTime.now().plusMinutes(5));
        when(userRepository.findByEmailIgnoreCase("learner@example.com")).thenReturn(Optional.of(user));

        for (int attempt = 0; attempt < 5; attempt++) {
            assertFalse(registrationService.verifyOtp("learner@example.com", "000000"));
        }
        assertFalse(registrationService.verifyOtp("learner@example.com", "123456"));

        registrationService.resetOtpAttempts("LEARNER@example.com");
        assertTrue(registrationService.verifyOtp("learner@example.com", "123456"));
    }
}

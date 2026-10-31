package com.elearning;

import com.elearning.controller.PaymentController;
import com.elearning.models.Payment;
import com.elearning.models.User;
import com.elearning.repositories.PaymentRepository;
import com.elearning.repositories.UserRepository;
import com.elearning.services.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    private UserDetails alice;
    private User aliceUser;

    @BeforeEach
    void setUp() {
        alice = org.springframework.security.core.userdetails.User
                .withUsername("alice@example.com").password("x").authorities("ROLE_USER").build();
        aliceUser = new User();
        aliceUser.setId(1L);
        aliceUser.setEmail("alice@example.com");
        aliceUser.setRole("USER");
    }

    @Test
    @DisplayName("SEC-06: a learner cannot start a payment for another user")
    void initiateForAnotherUserIsForbidden() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(aliceUser));
        PaymentController controller = new PaymentController(unconfiguredService(), userRepository);

        var response = controller.initiatePayment(2L, "UPI", "a@upi", "PhonePe", alice);

        assertEquals(HttpStatus.FORBIDDEN.value(), response.getStatusCode().value());
    }

    @Test
    @DisplayName("SEC-06: the server charges the fixed certificate fee, never a client amount")
    void initiateUsesServerSideFee() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(aliceUser));
        CapturingPaymentService paymentService = new CapturingPaymentService(paymentRepository);
        PaymentController controller = new PaymentController(paymentService, userRepository);

        var response = controller.initiatePayment(1L, "UPI", "a@upi", "PhonePe", alice);

        assertEquals(HttpStatus.OK.value(), response.getStatusCode().value());
        assertEquals(1L, paymentService.capturedUserId);
        assertEquals(PaymentService.CERTIFICATE_FEE_INR, paymentService.capturedAmount);
    }

    @Test
    @DisplayName("Unconfigured payments return 503 instead of a fake success")
    void initiateReturnsServiceUnavailableWhenUnconfigured() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(aliceUser));
        PaymentController controller = new PaymentController(unconfiguredService(), userRepository);

        var response = controller.initiatePayment(1L, "UPI", null, null, alice);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE.value(), response.getStatusCode().value());
    }

    @Test
    @DisplayName("SEC-06: a learner cannot verify somebody else's payment")
    void verifyForeignPaymentIsForbidden() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(aliceUser));
        Payment foreign = new Payment();
        foreign.setUserId(2L);
        when(paymentRepository.findByTransactionId("order_foreign")).thenReturn(foreign);
        PaymentController controller = new PaymentController(unconfiguredService(), userRepository);

        var response = controller.verifyPayment("order_foreign", "pay_1", "sig", alice);

        assertEquals(HttpStatus.FORBIDDEN.value(), response.getStatusCode().value());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Verification without authentication is rejected")
    void verifyWithoutAuthenticationIsForbidden() {
        PaymentController controller = new PaymentController(unconfiguredService(), userRepository);

        var response = controller.verifyPayment("order_1", "pay_1", "sig", null);

        assertEquals(HttpStatus.FORBIDDEN.value(), response.getStatusCode().value());
        verify(paymentRepository, never()).save(any());
    }

    private PaymentService unconfiguredService() {
        return new PaymentService(paymentRepository, "", "");
    }

    private static class CapturingPaymentService extends PaymentService {
        private Long capturedUserId;
        private double capturedAmount;

        CapturingPaymentService(PaymentRepository repository) {
            super(repository, "", "");
        }

        @Override
        public String createPayment(Long userId, Double amount, String paymentMethod, String upiId, String appName) {
            this.capturedUserId = userId;
            this.capturedAmount = amount;
            return "order_captured";
        }
    }
}

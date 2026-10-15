package com.elearning;

import com.elearning.models.Payment;
import com.elearning.repositories.PaymentRepository;
import com.elearning.services.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private PaymentService paymentService;

    private final String testKeySecret = "test_razorpay_secret_12345";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "razorpaySecret", testKeySecret);
        ReflectionTestUtils.setField(paymentService, "razorpayKey", "rzp_test_12345");
    }

    private String generateSignature(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    @Test
    @DisplayName("SEC-06: Verifies authentic Razorpay HMAC-SHA256 signature successfully")
    void testVerifyAndConfirmPayment_ValidSignature() throws Exception {
        String orderId = "order_test_98765";
        String paymentId = "pay_test_12345";
        String validSignature = generateSignature(orderId + "|" + paymentId, testKeySecret);

        Payment payment = new Payment();
        payment.setId(1L);
        payment.setTransactionId(orderId);
        payment.setStatus("PENDING");

        when(paymentRepository.findByTransactionId(orderId)).thenReturn(payment);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));

        boolean verified = paymentService.verifyAndConfirmPayment(orderId, paymentId, validSignature);

        assertTrue(verified);
        assertEquals("SUCCESS", payment.getStatus());
        verify(paymentRepository).save(payment);
    }

    @Test
    @DisplayName("SEC-06: Rejects forged or invalid Razorpay signature")
    void testVerifyAndConfirmPayment_InvalidSignature() {
        String orderId = "order_test_98765";
        String paymentId = "pay_test_12345";
        String fakeSignature = "bad_signature_1234567890abcdef";

        boolean verified = paymentService.verifyAndConfirmPayment(orderId, paymentId, fakeSignature);

        assertFalse(verified);
        verify(paymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("SEC-06: Rejects missing or blank signature")
    void testVerifyAndConfirmPayment_MissingSignature() {
        assertFalse(paymentService.verifyAndConfirmPayment("order_1", "pay_1", null));
        assertFalse(paymentService.verifyAndConfirmPayment("order_1", "pay_1", "   "));
        assertFalse(paymentService.verifyAndConfirmPayment(null, "pay_1", "sig"));
    }
}

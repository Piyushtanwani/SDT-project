package com.elearning.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.Payment;
import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import com.elearning.services.PaymentService;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    public PaymentController(PaymentService paymentService, UserRepository userRepository) {
        this.paymentService = paymentService;
        this.userRepository = userRepository;
    }

    @PostMapping("/initiate")
    public ResponseEntity<?> initiatePayment(
            @RequestParam Long userId,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String upiId,
            @RequestParam(required = false) String appName,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (!isSelfOrAdmin(userDetails, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Cannot initiate payment for another user"));
        }
        try {
            String orderId = paymentService.createPayment(
                    userId, PaymentService.CERTIFICATE_FEE_INR, paymentMethod, upiId, appName);
            return ResponseEntity.ok(Map.of("transactionId", orderId, "amount", String.valueOf(PaymentService.CERTIFICATE_FEE_INR)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Cryptographically verifies Razorpay payment callbacks.
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @RequestParam("razorpay_order_id") String orderId,
            @RequestParam("razorpay_payment_id") String paymentId,
            @RequestParam("razorpay_signature") String signature,
            @AuthenticationPrincipal UserDetails userDetails) {
        Payment payment = paymentService.findByOrderId(orderId);
        if (payment == null || !isSelfOrAdmin(userDetails, payment.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Cannot verify a payment that does not belong to you"));
        }
        boolean verified = paymentService.verifyAndConfirmPayment(orderId, paymentId, signature);
        if (verified) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Payment verified successfully"));
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Invalid payment signature"));
        }
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping("/update")
    public ResponseEntity<String> updatePaymentStatus(
            @RequestParam String transactionId,
            @RequestParam String status) {
        String response = paymentService.updatePaymentStatus(transactionId, status);
        return ResponseEntity.ok(response);
    }

    private boolean isSelfOrAdmin(UserDetails userDetails, Long userId) {
        if (userDetails == null || userId == null) {
            return false;
        }
        User caller = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (caller == null) {
            return false;
        }
        return "ADMIN".equalsIgnoreCase(caller.getRole()) || userId.equals(caller.getId());
    }
}

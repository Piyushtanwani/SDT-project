package com.elearning.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.elearning.services.PaymentService;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate")
    public ResponseEntity<Map<String, String>> initiatePayment(
            @RequestParam Long userId,
            @RequestParam Double amount,
            @RequestParam String paymentMethod,
            @RequestParam(required = false) String upiId,
            @RequestParam String appName) {
        String orderId = paymentService.createPayment(userId, amount, paymentMethod, upiId, appName);
        return ResponseEntity.ok(Map.of("transactionId", orderId));
    }

    /**
     * Cryptographically verifies Razorpay payment callbacks.
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @RequestParam("razorpay_order_id") String orderId,
            @RequestParam("razorpay_payment_id") String paymentId,
            @RequestParam("razorpay_signature") String signature) {
        boolean verified = paymentService.verifyAndConfirmPayment(orderId, paymentId, signature);
        if (verified) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Payment verified successfully"));
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Invalid payment signature"));
        }
    }

    @PostMapping("/update")
    public ResponseEntity<String> updatePaymentStatus(
            @RequestParam String transactionId,
            @RequestParam String status) {
        String response = paymentService.updatePaymentStatus(transactionId, status);
        return ResponseEntity.ok(response);
    }
}

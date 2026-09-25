package com.elearning.services;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.elearning.models.Payment;
import com.elearning.repositories.PaymentRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Service
public class PaymentService {

    private final String razorpayKey;
    private final String razorpaySecret;
    private final PaymentRepository paymentRepository;

    public PaymentService(
            PaymentRepository paymentRepository,
            @Value("${app.razorpay.key-id:REDACTED}") String razorpayKey,
            @Value("${app.razorpay.key-secret:REDACTED}") String razorpaySecret) {
        this.paymentRepository = paymentRepository;
        this.razorpayKey = razorpayKey;
        this.razorpaySecret = razorpaySecret;
    }

    @Transactional
    public String createPayment(Long userId, Double amount, String paymentMethod, String upiId, String appName) {
        try {
            RazorpayClient razorpay = new RazorpayClient(razorpayKey, razorpaySecret);

            JSONObject orderRequest = new JSONObject();
            // Amount in paise
            long amountInPaise = Math.round(amount * 100);
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("payment_capture", 1);

            Order order = razorpay.orders.create(orderRequest);
            String orderId = order.get("id");

            Payment payment = new Payment();
            payment.setUserId(userId);
            payment.setAmount(amount);
            payment.setPaymentMethod(paymentMethod != null ? paymentMethod : "ONLINE");
            payment.setUpiId(upiId);
            payment.setTransactionId(orderId);
            payment.setStatus("PENDING");
            payment.setAppName(appName);

            paymentRepository.save(payment);
            return orderId;
        } catch (RazorpayException e) {
            System.err.println("Razorpay Error: " + e.getMessage());
            return "Error Initiating Payment";
        }
    }

    /**
     * Verifies the cryptographic Razorpay signature and idempotently marks payment SUCCESS.
     */
    @Transactional
    public boolean verifyAndConfirmPayment(String orderId, String paymentId, String signature) {
        if (orderId == null || paymentId == null || signature == null) {
            return false;
        }

        boolean isValid = verifySignature(orderId, paymentId, signature);
        if (!isValid) {
            Payment payment = paymentRepository.findByTransactionId(orderId);
            if (payment != null && !"SUCCESS".equals(payment.getStatus())) {
                payment.setStatus("FAILED_VERIFICATION");
                paymentRepository.save(payment);
            }
            return false;
        }

        Payment payment = paymentRepository.findByTransactionId(orderId);
        if (payment != null) {
            payment.setStatus("SUCCESS");
            paymentRepository.save(payment);
            return true;
        }
        return false;
    }

    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(razorpaySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            return hexString.toString().equalsIgnoreCase(signature);
        } catch (Exception e) {
            System.err.println("Signature verification failed: " + e.getMessage());
            return false;
        }
    }

    @Transactional
    public String updatePaymentStatus(String transactionId, String status) {
        // Enforce safe status transitions
        Payment payment = paymentRepository.findByTransactionId(transactionId);
        if (payment != null) {
            // Do not downgrade a verified SUCCESS payment
            if ("SUCCESS".equals(payment.getStatus())) {
                return "Payment already verified successfully";
            }
            if ("SUCCESS".equalsIgnoreCase(status)) {
                return "Unverified SUCCESS status rejected. Signature verification required.";
            }
            payment.setStatus(status.toUpperCase());
            paymentRepository.save(payment);
            return "Payment Status Updated";
        }
        return "Transaction Not Found";
    }

    public boolean hasVerifiedPayment(Long userId) {
        if (userId == null) return false;
        return paymentRepository.findAll().stream()
                .anyMatch(p -> userId.equals(p.getUserId()) && "SUCCESS".equalsIgnoreCase(p.getStatus()));
    }
}

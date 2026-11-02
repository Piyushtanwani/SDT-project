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
import java.security.MessageDigest;
import java.util.Comparator;
import java.util.List;

@Service
public class PaymentService {

    public static final double CERTIFICATE_FEE_INR = 50.0;

    private final String razorpayKey;
    private final String razorpaySecret;
    private final PaymentRepository paymentRepository;

    public PaymentService(
            PaymentRepository paymentRepository,
            @Value("${app.razorpay.key-id:}") String razorpayKey,
            @Value("${app.razorpay.key-secret:}") String razorpaySecret) {
        this.paymentRepository = paymentRepository;
        this.razorpayKey = razorpayKey;
        this.razorpaySecret = razorpaySecret;
    }

    public boolean isConfigured() {
        return razorpayKey != null && !razorpayKey.isBlank()
                && razorpaySecret != null && !razorpaySecret.isBlank();
    }

    /**
     * The publishable key the checkout window must be opened with.
     *
     * The browser used to carry its own key as a build-time fallback, which meant a bundle could
     * open a checkout against a merchant account the server never created the order for. Handing
     * back the key this server actually holds keeps the two ends of a payment on the same account.
     */
    public String publicKeyId() {
        return isConfigured() ? razorpayKey.trim() : null;
    }

    public Payment findByOrderId(String orderId) {
        return paymentRepository.findByTransactionId(orderId);
    }

    /**
     * Whether a signature-verified fee is sitting here unspent.
     *
     * A certificate is bought, not awarded for free, so issuance asks this question of the payment
     * records the server itself wrote. A learner cannot present a receipt to unlock a credential.
     */
    public boolean hasUnspentCertificateFee(Long userId) {
        return !unspentFees(userId).isEmpty();
    }

    /** Ties the oldest unspent fee to the credential it paid for, so it cannot buy a second one. */
    @Transactional
    public void spendCertificateFee(Long userId, Long certificateId) {
        List<Payment> free = unspentFees(userId);
        if (free.isEmpty()) {
            throw new IllegalStateException("No verified certificate fee is on record for this account.");
        }
        Payment paid = free.get(0);
        paid.setCertificateId(certificateId);
        paymentRepository.save(paid);
    }

    private List<Payment> unspentFees(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return paymentRepository.findByUserIdAndStatusAndCertificateIdIsNull(userId, "SUCCESS").stream()
                .filter(paid -> paid.getAmount() != null && paid.getAmount() + 0.001 >= CERTIFICATE_FEE_INR)
                .sorted(Comparator.comparing(Payment::getCreatedAt))
                .toList();
    }

    @Transactional
    public String createPayment(Long userId, Double amount, String paymentMethod, String upiId, String appName) {
        if (!isConfigured()) {
            throw new IllegalStateException("Payments are not configured on this server.");
        }
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
            throw new IllegalStateException("Unable to reach the payment provider. Please try again later.", e);
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
        if (!isConfigured() || orderId == null || paymentId == null || signature == null) {
            return false;
        }
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

            return MessageDigest.isEqual(
                    hexString.toString().toLowerCase().getBytes(StandardCharsets.US_ASCII),
                    signature.toLowerCase().getBytes(StandardCharsets.US_ASCII));
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
}

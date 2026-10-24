package com.elearning.services;

import org.json.JSONObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.elearning.models.Payment;
import com.elearning.repositories.PaymentRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;

@Service
public class PaymentService {

    private static final String RAZORPAY_KEY = "rzp_test_mQf2cASnEwehms";
    private static final String RAZORPAY_SECRET = "unqMoyk2PrStZ0RxViTIrOCa";

    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public String createPayment(Long userId, Double amount, String paymentMethod, String upiId, String appName) {
        try {
            RazorpayClient razorpay = new RazorpayClient(RAZORPAY_KEY, RAZORPAY_SECRET);

            // ✅ Create Order - Do NOT pass VPA (UPI ID)
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amount * 100); // Amount in paise (499.99 INR -> 49999 paise)
            orderRequest.put("currency", "INR");
            orderRequest.put("payment_capture", 1); // Auto-capture payment

            Order order = razorpay.orders.create(orderRequest); // ✅ No UPI ID here

            // ✅ Save order details in DB
            Payment payment = new Payment();
            payment.setUserId(userId);
            payment.setAmount(amount);
            payment.setPaymentMethod(paymentMethod);
            payment.setTransactionId(order.get("id"));
            payment.setStatus("PENDING");
            payment.setAppName(appName);

            paymentRepository.save(payment);

            return order.get("id");

        } catch (RazorpayException e) {
            e.printStackTrace();
            return "Error Initiating Payment";
        }
    
    }

    public String updatePaymentStatus(String transactionId, String status) {
        Payment payment = paymentRepository.findByTransactionId(transactionId);
        if (payment != null) {
            payment.setStatus(status);
            paymentRepository.save(payment);
            return "Payment Status Updated";
        }
        return "Transaction Not Found";
    }
}

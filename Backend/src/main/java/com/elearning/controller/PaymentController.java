package com.elearning.controller;

import java.io.FileWriter;
import java.io.IOException;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.elearning.services.PaymentService;


@RestController
@RequestMapping("/payments")
@CrossOrigin(origins = "*")  // Allow all origins
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate")
    public ResponseEntity<Map<String, String>> initiatePayment(@RequestParam Long userId, 
                                                  @RequestParam Double amount, 
                                                  @RequestParam String paymentMethod,
                                                  @RequestParam(required = false) String upiId,
                                                  @RequestParam String appName) {
//    	 String orderId = paymentService.createPayment(userId, amount, paymentMethod, null, appName);
    	String response = paymentService.createPayment(userId, amount, paymentMethod, upiId, appName);
        System.out.println("Transaction request: "+response.toString());
    	return ResponseEntity.ok(Map.of("transactionId", response));
//        return ResponseEntity.ok(response);
    }

    @PostMapping("/update")
    public ResponseEntity<String> updatePaymentStatus(@RequestParam String transactionId, 
                                                      @RequestParam String status) {
        String response = paymentService.updatePaymentStatus(transactionId, status);
        System.err.println("update:-"+response.toString());
        return ResponseEntity.ok(response);
    }
   
}

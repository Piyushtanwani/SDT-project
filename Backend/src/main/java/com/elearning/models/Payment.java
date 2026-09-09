package com.elearning.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Double amount;
    private String upiId;
    private String transactionId;
    private String paymentMethod;  // UPI, Card, NetBanking
    private String status; // PENDING, SUCCESS, FAILED
    private String appName; // Name of the app that initiated payment
    private LocalDateTime createdAt = LocalDateTime.now();
	public Long getId() {
		return id;
	}
	public void setId(Long id) {
		this.id = id;
	}
	public Long getUserId() {
		return userId;
	}
	public void setUserId(Long userId) {
		this.userId = userId;
	}
	public Double getAmount() {
		return amount;
	}
	public void setAmount(Double amount) {
		this.amount = amount;
	}
	public String getUpiId() {
		return upiId;
	}
	public void setUpiId(String upiId) {
		this.upiId = upiId;
	}
	public String getTransactionId() {
		return transactionId;
	}
	public void setTransactionId(String transactionId) {
		this.transactionId = transactionId;
	}
	public String getPaymentMethod() {
		return paymentMethod;
	}
	public void setPaymentMethod(String paymentMethod) {
		this.paymentMethod = paymentMethod;
	}
	public String getStatus() {
		return status;
	}
	public void setStatus(String status) {
		this.status = status;
	}
	public String getAppName() {
		return appName;
	}
	public void setAppName(String appName) {
		this.appName = appName;
	}
	public LocalDateTime getCreatedAt() {
		return createdAt;
	}
	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}
	public Payment(Long id, Long userId, Double amount, String upiId, String transactionId, String paymentMethod,
			String status, String appName, LocalDateTime createdAt) {
		super();
		this.id = id;
		this.userId = userId;
		this.amount = amount;
		this.upiId = upiId;
		this.transactionId = transactionId;
		this.paymentMethod = paymentMethod;
		this.status = status;
		this.appName = appName;
		this.createdAt = createdAt;
	}
	public Payment() {
	}

}

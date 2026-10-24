package com.elearning.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.elearning.models.Payment;


public interface PaymentRepository extends JpaRepository<Payment, Long>{

	Payment findByTransactionId(String transactionId);

}

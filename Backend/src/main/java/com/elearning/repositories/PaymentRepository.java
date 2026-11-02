package com.elearning.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.elearning.models.Payment;

import java.util.List;


public interface PaymentRepository extends JpaRepository<Payment, Long>{

	Payment findByTransactionId(String transactionId);

	List<Payment> findByUserIdAndStatusAndCertificateIdIsNull(Long userId, String status);

}

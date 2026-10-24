package com.elearning.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.elearning.models.Certificate;
import com.elearning.response_request.UserCertificateDTO;

import java.util.List;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {
    List<Certificate> findByUserId(Long userId);
    List<Certificate> findByCourseId(Long courseId);
    Certificate getByCredentialId(String credentialId);
    long countByCourseId(Long courseId);

    @Query("SELECT new com.elearning.response_request.UserCertificateDTO(c.userId, u.name, c.courseId, cr.name, c.score) " +
           "FROM Certificate c " +
           "JOIN User u ON c.userId = u.id " +
           "JOIN Course cr ON c.courseId = cr.id " +
           "ORDER BY c.score DESC")
    List<UserCertificateDTO> findTopAchievers();
}

package com.elearning.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.elearning.models.ExamSnapshot;

import java.util.Collection;
import java.util.List;

public interface ExamSnapshotRepository extends JpaRepository<ExamSnapshot, Long> {
    List<ExamSnapshot> findByAttemptIdOrderByServerReceivedAtAsc(Long attemptId);

    long countByAttemptId(Long attemptId);

    @Query("""
            SELECT s.attemptId, COUNT(s) FROM ExamSnapshot s
            WHERE s.attemptId IN :attemptIds GROUP BY s.attemptId
            """)
    List<Object[]> countGrouped(@Param("attemptIds") Collection<Long> attemptIds);
}

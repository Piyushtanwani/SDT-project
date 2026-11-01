package com.elearning.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.elearning.models.ExamProctorEvent;

import java.util.Collection;
import java.util.List;

public interface ExamProctorEventRepository extends JpaRepository<ExamProctorEvent, Long> {
    List<ExamProctorEvent> findByAttemptIdOrderByServerReceivedAtAsc(Long attemptId);

    long countByAttemptId(Long attemptId);

    /** Counts for a whole page of attempts at once, so the integrity list is not one query per row. */
    @Query("""
            SELECT e.attemptId, COUNT(e) FROM ExamProctorEvent e
            WHERE e.attemptId IN :attemptIds GROUP BY e.attemptId
            """)
    List<Object[]> countGrouped(@Param("attemptIds") Collection<Long> attemptIds);
}

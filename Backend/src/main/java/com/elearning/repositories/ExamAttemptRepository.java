package com.elearning.repositories;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.elearning.models.ExamAttempt;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    /**
     * Statuses that use one of the allowed attempts, i.e. everything the candidate really sat.
     *
     * VOIDED is inside the set deliberately: a result thrown out by a reviewer was still a sitting
     * the candidate spent and, in a proctored exam, still a window during which they could look at
     * the question bank. Leaving it out would let "please void my attempt" buy a free retake.
     */
    List<String> COUNTED_STATUSES = List.of(
            ExamAttempt.STATUS_IN_PROGRESS, ExamAttempt.STATUS_SUBMITTED, ExamAttempt.STATUS_EXPIRED,
            ExamAttempt.STATUS_VOIDED);

    List<ExamAttempt> findByUserId(Long userId);

    List<ExamAttempt> findByCourseId(Long courseId);

    List<ExamAttempt> findByUserIdAndCourseId(Long userId, Long courseId);

    List<ExamAttempt> findByUserIdAndCourseIdAndStatus(Long userId, Long courseId, String status);

    Optional<ExamAttempt> findFirstByUserIdAndCourseIdAndStatusOrderByStartedAtDesc(
            Long userId, Long courseId, String status);

    @Query("""
            SELECT COUNT(a) FROM ExamAttempt a
            WHERE a.userId = :userId AND a.courseId = :courseId AND a.status IN :counted
            """)
    long countSittings(@Param("userId") Long userId,
                       @Param("courseId") Long courseId,
                       @Param("counted") Collection<String> counted);

    /** The most recent sitting, which is what a cooldown is measured from. */
    @Query("""
            SELECT a FROM ExamAttempt a
            WHERE a.userId = :userId AND a.courseId = :courseId AND a.status IN :counted
            ORDER BY COALESCE(a.submittedAt, a.attemptedAt) DESC
            """)
    List<ExamAttempt> findSittingsNewestFirst(@Param("userId") Long userId,
                                              @Param("courseId") Long courseId,
                                              @Param("counted") Collection<String> counted);

    List<ExamAttempt> findByStatusAndDeadlineBefore(String status, LocalDateTime cutoff);

    List<ExamAttempt> findByStatusAndAttemptedAtBefore(String status, LocalDateTime cutoff);

    List<ExamAttempt> findTop50ByOrderByIdDesc();

    List<ExamAttempt> findTop50ByIntegrityOrderByIdDesc(String integrity);

    List<ExamAttempt> findTop50ByUserIdOrderByIdDesc(Long userId);

    List<ExamAttempt> findTop50ByCourseIdOrderByIdDesc(Long courseId);

    /** Attempts waiting on a human, worst first, so the queue is self-ordering. */
    @Query("""
            SELECT a FROM ExamAttempt a
            WHERE a.integrity IN ('FLAGGED', 'REVIEW') AND a.reviewedAt IS NULL
            ORDER BY a.violationPoints DESC, a.attemptedAt DESC
            """)
    List<ExamAttempt> findAwaitingReview(Pageable pageable);

    /**
     * Other candidates' sittings that reached us from the same network address.
     *
     * A shared home connection is ordinary, so this is context a reviewer reads rather than a fault
     * that is scored; it exists so "two people sat this exam at once" is visible at all.
     */
    List<ExamAttempt> findTop5ByClientIpAndUserIdNotOrderByIdDesc(String clientIp, Long userId);

    List<ExamAttempt> findByClientIp(String clientIp);

    /** Open sittings whose full-screen clock has already run out, for the sweep to close. */
    List<ExamAttempt> findByStatusAndFullscreenBlockedSecondsGreaterThanEqual(String status, int seconds);
}

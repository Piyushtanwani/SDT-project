package com.elearning.repositories;

import com.elearning.models.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m "
            + "WHERE (m.sender.id = :userId AND m.receiver.id = :otherId) "
            + "OR (m.sender.id = :otherId AND m.receiver.id = :userId) "
            + "ORDER BY m.id DESC")
    List<Message> findConversation(@Param("userId") Long userId, @Param("otherId") Long otherId, Pageable pageable);

    @Query("SELECT m FROM Message m "
            + "WHERE ((m.sender.id = :userId AND m.receiver.id = :otherId) "
            + "OR (m.sender.id = :otherId AND m.receiver.id = :userId)) "
            + "AND m.id < :beforeId "
            + "ORDER BY m.id DESC")
    List<Message> findConversationBefore(@Param("userId") Long userId, @Param("otherId") Long otherId,
                                         @Param("beforeId") Long beforeId, Pageable pageable);
}
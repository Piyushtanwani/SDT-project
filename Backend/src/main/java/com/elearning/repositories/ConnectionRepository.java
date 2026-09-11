package com.elearning.repositories;

import com.elearning.models.Connection;
import com.elearning.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConnectionRepository extends JpaRepository<Connection, Long> {
    @Query("SELECT c FROM Connection c WHERE c.receiver.id = :userId AND c.status = :status")
    List<Connection> findByReceiverAndStatus(Long userId, String status);

    @Query("SELECT c FROM Connection c WHERE (c.sender.id = :userId OR c.receiver.id = :userId) AND c.status = :status")
    List<Connection> findBySenderOrReceiverAndStatus(Long userId, String status);

    @Query("SELECT c FROM Connection c WHERE (c.sender.id = :userId OR c.receiver.id = :userId) AND c.status = :status")
    List<Connection> findAcceptedConnections(Long userId, String status);

    @Query("SELECT c FROM Connection c WHERE c.sender.id = :senderId AND c.receiver.id = :receiverId")
    Optional<Connection> findBySenderAndReceiver(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId);
}
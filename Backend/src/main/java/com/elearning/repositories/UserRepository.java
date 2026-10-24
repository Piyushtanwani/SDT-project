package com.elearning.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.elearning.models.User;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findById(Long id);

    @Query("SELECT u FROM User u JOIN u.skills s WHERE s.name IN :skills AND (:role IS NULL OR u.role = :role) AND (:timezone IS NULL OR u.timezone = :timezone)")
    List<User> findByFilters(List<String> skills, String role, String timezone);
}

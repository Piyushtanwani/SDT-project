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

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN u.skills s WHERE " +
           "(:skillsEmpty = true OR s.name IN :skills) AND " +
           "(:role IS NULL OR :role = '' OR u.role = :role) AND " +
           "(:timezone IS NULL OR :timezone = '' OR u.timezone = :timezone)")
    List<User> findByFilters(
            @org.springframework.data.repository.query.Param("skills") List<String> skills,
            @org.springframework.data.repository.query.Param("skillsEmpty") boolean skillsEmpty,
            @org.springframework.data.repository.query.Param("role") String role,
            @org.springframework.data.repository.query.Param("timezone") String timezone);
}

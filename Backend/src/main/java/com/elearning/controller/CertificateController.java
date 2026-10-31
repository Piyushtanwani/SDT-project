package com.elearning.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.Certificate;
import com.elearning.models.Course;
import com.elearning.models.User;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.CredentialVerificationDTO;
import com.elearning.response_request.UserCertificateDTO;
import com.elearning.services.CertificateService;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {

    private final CertificateService certificateService;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;

    public CertificateController(CertificateService certificateService, UserRepository userRepository,
                                 CourseRepository courseRepository) {
        this.certificateService = certificateService;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
    }

    @GetMapping("/count/{courseId}")
    public ResponseEntity<Long> getCertificateCount(@PathVariable Long courseId) {
        long count = certificateService.countCertificatesByCourse(courseId);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<UserCertificateDTO>> getLeaderboard() {
        List<UserCertificateDTO> leaderboard = certificateService.getLeaderboard();
        return ResponseEntity.ok(leaderboard);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getCertificatesByUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Optional<User> caller = caller(userDetails);
        if (caller.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }
        boolean isAdmin = "ADMIN".equalsIgnoreCase(caller.get().getRole());
        if (!isAdmin && !caller.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Cannot read another user's certificates");
        }
        return ResponseEntity.ok(certificateService.getCertificatesByUser(userId));
    }

    @GetMapping("/credential/{credentialId}")
    public ResponseEntity<CredentialVerificationDTO> getCertificateByCredentialId(@PathVariable String credentialId) {
        Optional<Certificate> certificate = certificateService.getCertificatesByCredentialId(credentialId);
        if (certificate.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        Certificate cert = certificate.get();
        String holderName = userRepository.findById(cert.getUserId())
                .map(User::getUsername)
                .orElse("Unknown learner");
        String courseName = courseRepository.findById(cert.getCourseId())
                .map(Course::getName)
                .orElse("Unknown course");
        return ResponseEntity.ok(new CredentialVerificationDTO(
                cert.getCredentialId(), holderName, courseName, cert.getScore(), cert.getIssuedAt()));
    }

    @PostMapping
    public ResponseEntity<?> issueCertificate(
            @RequestParam Long userId,
            @RequestParam Long courseId,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Enforce authorization: user can only issue certificate for themselves, unless admin
        Optional<User> caller = caller(userDetails);
        if (caller.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }
        boolean isAdmin = "ADMIN".equalsIgnoreCase(caller.get().getRole());
        if (!isAdmin && !caller.get().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Cannot issue certificate for another user");
        }

        try {
            Certificate cert = certificateService.issueCertificate(userId, courseId);
            return ResponseEntity.ok(cert);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to issue certificate");
        }
    }

    private Optional<User> caller(UserDetails userDetails) {
        if (userDetails == null) {
            return Optional.empty();
        }
        return userRepository.findByEmail(userDetails.getUsername());
    }
}

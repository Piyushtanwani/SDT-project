package com.elearning.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.Certificate;
import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.UserCertificateDTO;
import com.elearning.services.CertificateService;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {

    private final CertificateService certificateService;
    private final UserRepository userRepository;

    public CertificateController(CertificateService certificateService, UserRepository userRepository) {
        this.certificateService = certificateService;
        this.userRepository = userRepository;
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
    public ResponseEntity<List<Certificate>> getCertificatesByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(certificateService.getCertificatesByUser(userId));
    }

    @GetMapping("/credential/{credentialId}")
    public ResponseEntity<Certificate> getCertificateByCredentialId(@PathVariable String credentialId) {
        Optional<Certificate> certificate = certificateService.getCertificatesByCredentialId(credentialId);
        return certificate.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    public ResponseEntity<?> issueCertificate(
            @RequestParam Long userId,
            @RequestParam Long courseId,
            @RequestParam double score,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Enforce authorization: user can only issue certificate for themselves, unless admin
        if (userDetails != null) {
            Optional<User> caller = userRepository.findByEmail(userDetails.getUsername());
            if (caller.isPresent()) {
                boolean isAdmin = "ADMIN".equalsIgnoreCase(caller.get().getRole());
                if (!isAdmin && !caller.get().getId().equals(userId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Cannot issue certificate for another user");
                }
            }
        }

        try {
            Certificate cert = certificateService.issueCertificate(userId, courseId, score);
            return ResponseEntity.ok(cert);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to issue certificate: " + e.getMessage());
        }
    }
}

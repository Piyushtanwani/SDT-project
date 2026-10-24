package com.elearning.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.Certificate;
import com.elearning.response_request.UserCertificateDTO;
import com.elearning.services.CertificateService;

import java.util.List;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {

    private final CertificateService certificateService;

    public CertificateController(CertificateService certificateService) {
        this.certificateService = certificateService;
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
    public List<Certificate> getCertificatesByUser(@PathVariable Long userId) {
        return certificateService.getCertificatesByUser(userId);
    }
    
    @GetMapping("/credential/{credentialId}")
    public Certificate getCertificatesByUser(@PathVariable String credentialId) {
    	Certificate obj=new Certificate();
    	try 
    	{
    		obj=certificateService.getCertificatesByCredentialId(credentialId);
    		return obj;
    	}
        catch (Exception e) {
			return null;
		}
    }


    @PostMapping
    public Certificate issueCertificate(@RequestParam Long userId, @RequestParam Long courseId, @RequestParam double score) {
    	return certificateService.issueCertificate(userId, courseId, score);
        
        
    }
}

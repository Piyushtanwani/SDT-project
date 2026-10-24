package com.elearning.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.ApiResponse;
import com.elearning.response_request.LoginRequest;
import com.elearning.response_request.LoginResponse;
import com.elearning.response_request.OtpVerificationRequest;
import com.elearning.security.JwtService;
import com.elearning.services.CustomUserDetailsService;
import com.elearning.services.EmailService;
import com.elearning.services.OtpService;
import com.elearning.services.RegistrationService;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;



@RestController
@RequestMapping("/api/auth")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
      
        this.userRepository = userRepository;
         }
    
    @GetMapping("/getallusers")
    public List<User> getAllUsers(){
    	
    	return userRepository.findAll();
    }
    @PutMapping("/updateuser/{id}")
    public ResponseEntity<ApiResponse> updateUser(@PathVariable Long id, @RequestBody User updatedUser) {
        Optional<User> existingUser = userRepository.findById(id);
        if (!existingUser.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(new ApiResponse("User not found", null));
        }
        User user = existingUser.get();
        user.setName(updatedUser.getName());
        user.setRole(updatedUser.getRole());
        user.setEnabled(updatedUser.isEnabled());
        userRepository.save(user);
        return ResponseEntity.ok(new ApiResponse("User updated successfully", user));
    }

    @DeleteMapping("/deleteuser/{id}")
    public ResponseEntity<ApiResponse> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(new ApiResponse("User not found", null));
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(new ApiResponse("User deleted successfully", null));
    }
    public class ApiResponse {
        private String message;
        private Object data;
        public ApiResponse() {
        }
        public ApiResponse(String message, Object data) {
            this.message = message;
            this.data = data;
        }
		public String getMessage() {
			return message;
		}
		public void setMessage(String message) {
			this.message = message;
		}
		public Object getData() {
			return data;
		}
		public void setData(Object data) {
			this.data = data;
		}
        
    }
    
}

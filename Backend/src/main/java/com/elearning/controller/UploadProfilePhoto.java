package com.elearning.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/upload/profilephoto")
public class UploadProfilePhoto {

    private final Cloudinary cloudinary;
    private final boolean configured;
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    public UploadProfilePhoto(
            @Value("${app.cloudinary.cloud-name}") String cloudName,
            @Value("${app.cloudinary.api-key}") String apiKey,
            @Value("${app.cloudinary.api-secret}") String apiSecret) {
        this.configured = isSet(cloudName) && isSet(apiKey) && isSet(apiSecret);
        this.cloudinary = configured
                ? new Cloudinary(ObjectUtils.asMap(
                        "cloud_name", cloudName,
                        "api_key", apiKey,
                        "api_secret", apiSecret))
                : null;
    }

    private static boolean isSet(String value) {
        return value != null && !value.isBlank();
    }

    @PostMapping
    public ResponseEntity<String> uploadFile(@RequestParam("thumbnailUrl") MultipartFile file) {
        if (!configured) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Image storage is not configured on this server.");
        }

        if (file == null || file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("No file uploaded");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("File size exceeds 5MB limit.");
        }

        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "resource_type", "image",
                    "folder", "lwl_uploads"
            ));
            Object secureUrl = uploadResult.get("secure_url");
            if (secureUrl == null) {
                throw new IllegalStateException("Upload response did not contain a secure URL");
            }
            return ResponseEntity.ok(secureUrl.toString());
        } catch (Exception e) {
            System.err.println("Image upload failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body("Image upload is unavailable. Please try again later.");
        }
    }
}

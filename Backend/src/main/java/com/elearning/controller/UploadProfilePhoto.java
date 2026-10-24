package com.elearning.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/upload/profilephoto")
public class UploadProfilePhoto {

    private final Cloudinary cloudinary;
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    public UploadProfilePhoto(
            @Value("${app.cloudinary.cloud-name}") String cloudName,
            @Value("${app.cloudinary.api-key}") String apiKey,
            @Value("${app.cloudinary.api-secret}") String apiSecret) {
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret
        ));
    }

    @PostMapping
    public ResponseEntity<String> uploadFile(@RequestParam("thumbnailUrl") MultipartFile file) {
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
            String secureUrl = uploadResult.get("secure_url").toString();
            return ResponseEntity.ok(secureUrl);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("File upload failed: " + e.getMessage());
        }
    }
}

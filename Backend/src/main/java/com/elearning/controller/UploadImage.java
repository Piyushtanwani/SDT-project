package com.elearning.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/upload")
public class UploadImage {

    @Value("${file.upload-dir:./uploads/}")
    private String uploadDir;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".gif");
    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
            "image/jpeg", "image/png", "image/webp", "image/gif"
    );

    @PostConstruct
    public void createUploadDir() {
        File dir = new File(uploadDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }

    @PostMapping
    public ResponseEntity<String> uploadFile(@RequestParam("thumbnailUrl") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("No file uploaded");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid filename");
        }

        String cleanFilename = Paths.get(originalFilename).getFileName().toString();
        int extIndex = cleanFilename.lastIndexOf('.');
        if (extIndex == -1) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("File must have an image extension");
        }

        String extension = cleanFilename.substring(extIndex).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Disallowed file extension: " + extension);
        }

        try {
            Path targetDir = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }

            // Generate safe non-guessable UUID filename
            String safeFileName = UUID.randomUUID().toString() + extension;
            Path destinationPath = targetDir.resolve(safeFileName).normalize();

            // Verify path traversal prevention
            if (!destinationPath.startsWith(targetDir)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid file path");
            }

            Files.copy(file.getInputStream(), destinationPath, StandardCopyOption.REPLACE_EXISTING);
            return ResponseEntity.ok("/uploads/" + safeFileName);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("File upload failed: " + e.getMessage());
        }
    }
}

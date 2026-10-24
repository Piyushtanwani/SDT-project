package com.elearning.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/upload")
public class UploadImage {

    // Define the upload directory (absolute or relative path as needed)
    private static final String UPLOAD_DIR = "src/main/resources/static/uploads/";

    // Ensure the upload directory exists at startup (optional, for startup checks)
    @PostConstruct
    public void createUploadDir() {
        File dir = new File(UPLOAD_DIR);
        if (!dir.exists()) {
            boolean isCreated = dir.mkdirs(); // Create the directory if it doesn't exist
            if (!isCreated) {
                throw new RuntimeException("Failed to create upload directory: " + UPLOAD_DIR);
            }
        }
    }

    @PostMapping
    public String uploadFile(@RequestParam("thumbnailUrl") MultipartFile file) {
        try {
            // Ensure the upload directory exists
            File dir = new File(UPLOAD_DIR);
            if (!dir.exists()) {
                boolean isCreated = dir.mkdirs(); // Create the directory if it doesn't exist
                if (!isCreated) {
                    throw new IOException("Failed to create directory: " + UPLOAD_DIR);
                }
            } 

            // Get the file's original filename
            String fileName = file.getOriginalFilename();
            if (fileName == null || fileName.isEmpty()) {
                return "Invalid file name";
            }

            // Create a destination file in the uploads folder
            Path destinationPath = Paths.get(UPLOAD_DIR, fileName);

            // Check if the file already exists
            if (Files.exists(destinationPath)) {
                return fileName;
            }
  
            // Access the temporary file location handled by Tomcat
            File tempFile = File.createTempFile("upload-", file.getOriginalFilename());
            file.transferTo(tempFile); // Transfer the uploaded file to the temporary file

            // Move the file from the temporary location to the target directory
            Files.move(tempFile.toPath(), destinationPath);

            // Return a success message
            return fileName;
        } catch (IOException e) {
            e.printStackTrace();
            return "File upload failed: " + e.getMessage();
        }
    }
}

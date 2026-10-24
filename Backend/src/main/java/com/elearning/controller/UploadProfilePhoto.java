package com.elearning.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/upload/profilephoto")
public class UploadProfilePhoto {

    private final Cloudinary cloudinary = new Cloudinary(ObjectUtils.asMap(
        "cloud_name", "dhzwaenxb",
        "api_key", "869376214487945",
        "api_secret", "U2rUyOpx7Fin-cRcWOmbgbnijCQ"
    ));

    @PostMapping
    public String uploadFile(@RequestParam("thumbnailUrl") MultipartFile file) {
        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            return uploadResult.get("secure_url").toString(); // Returns the image URL
        } catch (IOException e) {
            e.printStackTrace();
            return "File upload failed: " + e.getMessage();
        }
    }
}


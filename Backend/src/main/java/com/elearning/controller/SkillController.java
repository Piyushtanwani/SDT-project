package com.elearning.controller;

import com.elearning.models.Skill;
import com.elearning.repositories.SkillRepository;
import com.elearning.response_request.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/skills")
public class SkillController {

    @Autowired
    private SkillRepository skillRepository;

    // Get all skills (public for UpdateProfile)
    @GetMapping
    public ResponseEntity<List<Skill>> getAllSkills() {
        try {
            List<Skill> skills = skillRepository.findAll();
            return ResponseEntity.ok(skills);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    
    // Create a skill (admin-only)
    @PostMapping
    public ResponseEntity<ApiResponse> createSkill(@RequestBody Skill skill) {
        try {
            if (skill.getName() == null || skill.getName().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Skill name is required"));
            }

            String skillName = skill.getName().trim();

            // Check for duplicate name
            Skill existingSkill = skillRepository.findByName(skillName);
            if (existingSkill != null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Skill name already exists"));
            }

            Skill newSkill = new Skill();
            newSkill.setName(skillName);
            skillRepository.save(newSkill);

            return ResponseEntity.ok(new ApiResponse(true, "Skill created successfully"));
        } catch (Exception e) {
            e.printStackTrace(); // helpful for debugging
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to create skill: " + e.getMessage()));
        }
    }

    // Update a skill (admin-only)
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse> updateSkill(@PathVariable Long id, @RequestBody Skill updatedSkill) {
        try {
            Optional<Skill> existingSkillOpt = skillRepository.findById(id);
            if (!existingSkillOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse(false, "Skill not found with ID: " + id));
            }

            if (updatedSkill.getName() == null || updatedSkill.getName().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Skill name is required"));
            }

            // Check for duplicate name (excluding current skill)
            Optional<Skill> duplicateSkill = Optional.ofNullable(skillRepository.findByName(updatedSkill.getName().trim()));
            if (duplicateSkill.isPresent() && !duplicateSkill.get().getId().equals(id)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Skill name already exists"));
            }

            Skill existingSkill = existingSkillOpt.get();
            existingSkill.setName(updatedSkill.getName().trim());
            skillRepository.save(existingSkill);

            return ResponseEntity.ok(new ApiResponse(true, "Skill updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to update skill: " + e.getMessage()));
        }
    }

    // Delete a skill (admin-only)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteSkill(@PathVariable Long id) {
        try {
            if (!skillRepository.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse(false, "Skill not found with ID: " + id));
            }

            skillRepository.deleteById(id);
            return ResponseEntity.ok(new ApiResponse(true, "Skill deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to delete skill: " + e.getMessage()));
        }
    }
}
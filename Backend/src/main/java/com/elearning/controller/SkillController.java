package com.elearning.controller;

import com.elearning.models.Skill;
import com.elearning.repositories.SkillRepository;
import com.elearning.repositories.UserRepository;
import com.elearning.response_request.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/skills")
public class SkillController {

    private final SkillRepository skillRepository;
    private final UserRepository userRepository;

    public SkillController(SkillRepository skillRepository, UserRepository userRepository) {
        this.skillRepository = skillRepository;
        this.userRepository = userRepository;
    }

    // Available to any signed-in user so profile editing can list skills.
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

            if (skillRepository.findByNameIgnoreCase(skillName).isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Skill name already exists"));
            }

            Skill newSkill = new Skill();
            newSkill.setName(skillName);
            skillRepository.save(newSkill);

            return ResponseEntity.ok(new ApiResponse(true, "Skill created successfully"));
        } catch (Exception e) {
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

            String skillName = updatedSkill.getName().trim();
            Optional<Skill> duplicate = skillRepository.findByNameIgnoreCase(skillName);
            if (duplicate.isPresent() && !duplicate.get().getId().equals(id)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse(false, "Skill name already exists"));
            }

            Skill existingSkill = existingSkillOpt.get();
            existingSkill.setName(skillName);
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

            long assignedUsers = userRepository.countBySkills_Id(id);
            if (assignedUsers > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ApiResponse(false,
                                "This skill is assigned to " + assignedUsers
                                        + " member(s). Remove it from their profiles before deleting."));
            }

            skillRepository.deleteById(id);
            return ResponseEntity.ok(new ApiResponse(true, "Skill deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to delete skill: " + e.getMessage()));
        }
    }
}
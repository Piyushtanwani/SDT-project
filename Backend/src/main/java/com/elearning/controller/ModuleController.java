package com.elearning.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.Course;
import com.elearning.models.Module;
import com.elearning.repositories.CourseRepository;
import com.elearning.services.ModuleService;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/module")
public class ModuleController {

    private final ModuleService moduleService;
    private final CourseRepository courseRepository;

    public ModuleController(ModuleService moduleService, CourseRepository courseRepository) {
        this.moduleService = moduleService;
        this.courseRepository = courseRepository;
    }
    
    // ✅ Add a module (Auto-increment moduleNumber for a course)
    @PostMapping("/add/{courseId}")
    public ResponseEntity<String> addModule(@PathVariable Long courseId, @RequestBody Module module) {
        if (!courseRepository.existsById(courseId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Course not found");
        }
        String validationError = validateModule(module);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(validationError);
        }
        module.setModuleTitle(module.getModuleTitle().trim());
        moduleService.addModule(courseId, module);
        return ResponseEntity.status(HttpStatus.CREATED).body("Module added successfully to Course ID: " + courseId);
    }

    // ✅ Get all modules for a course (returns module number, title, and timestamp)
    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<Object[]>> getModulesByCourse(@PathVariable Long courseId) {
        List<Object[]> modules = moduleService.getModulesByCourse(courseId);
        return ResponseEntity.ok(modules);
    }

    // ✅ Get a single module by ID
    @GetMapping("/{moduleId}")
    public ResponseEntity<Module> getModuleById(@PathVariable Long moduleId) {
        return ResponseEntity.ok(moduleService.getModuleById(moduleId));
    }

 // ✅ Get a specific module by Course ID and Module Number
    @GetMapping("/course/{courseId}/module/{moduleNumber}")
    public ResponseEntity<Module> getModuleByCourseAndModuleNumber(
            @PathVariable Long courseId, @PathVariable int moduleNumber) {
        Module module = moduleService.getModuleByCourseAndModuleNumber(courseId, moduleNumber);
        return ResponseEntity.ok(module);
    }

    
    // ✅ Update a module
    @PutMapping("/update/{moduleId}")
    public ResponseEntity<String> updateModule(@PathVariable Long moduleId, @RequestBody Module moduleDetails) {
        moduleService.getModuleById(moduleId);
        String validationError = validateModule(moduleDetails);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(validationError);
        }
        moduleDetails.setModuleTitle(moduleDetails.getModuleTitle().trim());
        moduleService.updateModule(moduleId, moduleDetails);
        return ResponseEntity.ok("Module updated successfully");
    }

    // ✅ Delete a module
    @DeleteMapping("/delete/{moduleId}")
    public ResponseEntity<String> deleteModule(@PathVariable Long moduleId) {
        moduleService.deleteModule(moduleId);
        return ResponseEntity.ok("Module deleted successfully");
    }

    private String validateModule(Module module) {
        if (module == null) {
            return "Module details are required.";
        }
        String title = module.getModuleTitle();
        if (title == null || title.isBlank()) {
            return "Module title is required.";
        }
        if (title.trim().length() > 255) {
            return "Module title must be 255 characters or fewer.";
        }
        List<String> content = module.getContent();
        if (content == null || content.isEmpty()
                || content.stream().anyMatch(item -> item == null || item.isBlank())) {
            return "Each module needs at least one non-empty content section.";
        }
        return null;
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<String> handleNotFound(NoSuchElementException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(exception.getMessage());
    }
}


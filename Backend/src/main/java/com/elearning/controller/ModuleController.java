package com.elearning.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.elearning.models.Course;
import com.elearning.models.Module;
import com.elearning.repositories.CourseRepository;
import com.elearning.services.ModuleService;

import java.util.List;

@RestController
@RequestMapping("/module")
public class ModuleController {

    @Autowired
    private ModuleService moduleService;

    @Autowired
    private CourseRepository courseRepository;
    
    // ✅ Add a module (Auto-increment moduleNumber for a course)
    @PostMapping("/add/{courseId}")
    public ResponseEntity<String> addModule(@PathVariable Long courseId, @RequestBody Module module) {
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
        moduleService.updateModule(moduleId, moduleDetails);
        return ResponseEntity.ok("Module updated successfully");
    }

    // ✅ Delete a module
    @DeleteMapping("/delete/{moduleId}")
    public ResponseEntity<String> deleteModule(@PathVariable Long moduleId) {
        moduleService.deleteModule(moduleId);
        return ResponseEntity.ok("Module deleted successfully");
    }
}


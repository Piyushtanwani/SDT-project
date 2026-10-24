package com.elearning.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.elearning.models.Module;
import com.elearning.repositories.ModuleRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ModuleService {

    @Autowired
    private ModuleRepository moduleRepository;

    
    // ✅ Add a module with auto-increment moduleNumber for the same course
    public void addModule(Long courseId, Module module) {
        int lastModuleNumber = moduleRepository.findLastModuleNumberByCourseId(courseId);
        module.setModuleNumber(lastModuleNumber + 1);
        module.setCourseId(courseId);
        module.setLastUpdated(LocalDateTime.now());
        moduleRepository.save(module);
    }

 // ✅ Get a module by Course ID and Module Number
    public Module getModuleByCourseAndModuleNumber(Long courseId, int moduleNumber) {
        return moduleRepository.findByCourseIdAndModuleNumber(courseId, moduleNumber)
                .orElseThrow(() -> new RuntimeException("Module not found for Course ID: " + courseId + " and Module Number: " + moduleNumber));
    }

    // ✅ Get all modules for a course (returns only moduleNumber, title, and timestamp)
    public List<Object[]> getModulesByCourse(Long courseId) {
        return moduleRepository.findModulesByCourseId(courseId);
    }

    // ✅ Get a module by ID
    public Module getModuleById(Long moduleId) {
        return moduleRepository.findById(moduleId).orElseThrow(() -> new RuntimeException("Module not found"));
    }

    // ✅ Update a module
    public void updateModule(Long moduleId, Module moduleDetails) {
        Module module = getModuleById(moduleId);
        module.setModuleTitle(moduleDetails.getModuleTitle());
        module.setImageUrls(moduleDetails.getImageUrls());
        module.setContent(moduleDetails.getContent());
        module.setLastUpdated(LocalDateTime.now());
        moduleRepository.save(module);
    }

    // ✅ Delete a module
    public void deleteModule(Long moduleId) {
        moduleRepository.deleteById(moduleId);
    }
}

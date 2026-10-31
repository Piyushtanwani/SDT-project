package com.elearning.services;

import org.springframework.stereotype.Service;

import com.elearning.models.Module;
import com.elearning.repositories.ModuleRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ModuleService {

    private final ModuleRepository moduleRepository;

    public ModuleService(ModuleRepository moduleRepository) {
        this.moduleRepository = moduleRepository;
    }

    
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
                .orElseThrow(() -> new NoSuchElementException(
                        "Module " + moduleNumber + " was not found for this course."));
    }

    // ✅ Get all modules for a course (returns only moduleNumber, title, and timestamp)
    public List<Object[]> getModulesByCourse(Long courseId) {
        return moduleRepository.findModulesByCourseId(courseId);
    }

    // ✅ Get a module by ID
    public Module getModuleById(Long moduleId) {
        return moduleRepository.findById(moduleId)
                .orElseThrow(() -> new NoSuchElementException("Module not found."));
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
        if (!moduleRepository.existsById(moduleId)) {
            throw new NoSuchElementException("Module not found.");
        }
        moduleRepository.deleteById(moduleId);
    }
}

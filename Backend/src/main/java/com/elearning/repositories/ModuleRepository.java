package com.elearning.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.elearning.models.Module;

public interface ModuleRepository extends JpaRepository<Module, Long> {

	 // ✅ Find the last module number for a given course (default 0 if no module exists)
    @Query("SELECT COALESCE(MAX(m.moduleNumber), 0) FROM Module m WHERE m.courseId = :courseId")
    int findLastModuleNumberByCourseId(Long courseId);
 // ✅ Find a module by Course ID and Module Number
    Optional<Module> findByCourseIdAndModuleNumber(Long courseId, int moduleNumber);
    
    // ✅ Get moduleNumber, title, and lastUpdated for a given course
    @Query("SELECT m.moduleNumber, m.moduleTitle, m.lastUpdated FROM Module m WHERE m.courseId = :courseId ORDER BY m.moduleNumber")
    List<Object[]> findModulesByCourseId(Long courseId);
	
}

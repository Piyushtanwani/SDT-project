package com.elearning.controller;

import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.elearning.models.Course;
import com.elearning.repositories.ModuleRepository;
import com.elearning.services.CourseService;

@RestController
@RequestMapping("/course")
public class CourseController {

	@Autowired
	private CourseService courseService; 
	
	@Autowired
	private ModuleRepository moduleRepository;
	
	 @PostMapping("/add")
	    public ResponseEntity<String> addCourse(@RequestBody Course course) {
		 courseService.addCourse(course);
		 return ResponseEntity.status(HttpStatus.OK).body("Course Added Successfully" );
	 }
	 
	 @GetMapping("/getCourseName/{id}")
	 public ResponseEntity<String> getNameById(@PathVariable Long id) {
		 try {
		String CourseName=courseService.getCourseName(id);
		return ResponseEntity.status(HttpStatus.OK).body(CourseName );
		 }
		 catch (Exception e) {
			 return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Course Not Found" );
		}
		
	 }
	 @DeleteMapping("/deletecourse/{id}")
	 public ResponseEntity<String> deleteCourseById(@PathVariable Long id) {
		 try {
			 courseService.deleteCourseById(id);
		return ResponseEntity.status(HttpStatus.OK).body("Course Deleted Successfully");
		 }
		 catch (NoSuchElementException e) {
			 return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Course Not Found");
		}
		 catch (IllegalStateException e) {
			 return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
		}
		 catch (Exception e) {
			 return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Failed to delete course. Please try again.");
		}
		
	 }
	
	 @GetMapping("/getCourses")
	 public ResponseEntity<List<Course>> getAllCourses() {
		 List<Course> allcourses=courseService.getAllCourses();
		 for (Course course : allcourses) {
			 course.setModulesCount((int) moduleRepository.countByCourseId(course.getId()));
		 }
		return ResponseEntity.status(HttpStatus.OK).body(allcourses );
		
	 }
	
	
}

package com.elearning.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.elearning.models.Course;
import com.elearning.repositories.CourseRepository;

@Service
public class CourseService {

	 @Autowired
	 private CourseRepository courseRepository;
	
	 public void addCourse(Course course) {
		 courseRepository.save(course);
	    }
	 public String getCourseName(Long id) {
		 Course obj1=courseRepository.getById(id);
		 return obj1.getName();
		 }
	 public List<Course> getAllCourses() {
		 List<Course> allcourses =courseRepository.findAll();
		 return allcourses;
		 }
	 public void deleteCourseById(Long id) {
		courseRepository.deleteById(id);
		 }
}

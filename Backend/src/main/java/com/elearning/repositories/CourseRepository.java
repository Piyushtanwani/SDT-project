package com.elearning.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.elearning.models.Course;


public interface CourseRepository  extends JpaRepository<Course, Long> {


	
}

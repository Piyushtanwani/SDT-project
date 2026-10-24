package com.elearning.models;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Module {

	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	private long courseId;
	private int moduleNumber;
	private String moduleTitle;
	private List<String> imageUrls;
	@Column(length = 2000)
	private List<String> content;
	private LocalDateTime lastUpdated;
	
	public Long getId() {
		return id;
	}
	public void setId(Long id) {
		this.id = id;
	}
	public long getCourseId() {
		return courseId;
	}
	public void setCourseId(long courseId) {
		this.courseId = courseId;
	}
	public int getModuleNumber() {
		return moduleNumber;
	}
	public void setModuleNumber(int moduleNumber) {
		this.moduleNumber = moduleNumber;
	}
	public String getModuleTitle() {
		return moduleTitle;
	}
	public void setModuleTitle(String moduleTitle) {
		this.moduleTitle = moduleTitle;
	}
	public List<String> getImageUrls() {
		return imageUrls;
	}
	public void setImageUrls(List<String> imageUrls) {
		this.imageUrls = imageUrls;
	}
	public List<String> getContent() {
		return content;
	}
	public void setContent(List<String> content) {
		this.content = content;
	}
	public LocalDateTime getLastUpdated() {
		return lastUpdated;
	}
	public void setLastUpdated(LocalDateTime lastUpdated) {
		this.lastUpdated = lastUpdated;
	}
	public Module(Long id, long courseId, int moduleNumber, String moduleTitle, List<String> imageUrls,
			List<String> content, LocalDateTime lastUpdated) {
		super();
		this.id = id;
		this.courseId = courseId;
		this.moduleNumber = moduleNumber;
		this.moduleTitle = moduleTitle;
		this.imageUrls = imageUrls;
		this.content = content;
		this.lastUpdated = lastUpdated;
	}
	public Module() {
		
	}

	
	
}

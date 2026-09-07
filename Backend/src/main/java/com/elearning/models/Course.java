package com.elearning.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

@Entity
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private String duration;
    private String thumbnailUrl;
    private Double rating;
    private String slug;

    @PrePersist
    @PreUpdate
    public void generateSlug() {
        if (this.slug == null || this.slug.isBlank()) {
            if (this.name != null && !this.name.isBlank()) {
                this.slug = this.name.trim().toLowerCase()
                        .replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("^-+|-+$", "");
            }
            if (this.slug == null || this.slug.isBlank()) {
                this.slug = "course-" + System.currentTimeMillis();
            }
        }
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

	public Long getId() {
		return id;
	}
	public void setId(Long id) {
		this.id = id;
	}
	public String getName() {
		return name;
	}
	public void setName(String name) {
		this.name = name;
	}
	public String getDuration() {
		return duration;
	}
	public void setDuration(String duration) {
		this.duration = duration;
	}
	public String getThumbnailUrl() {
		return thumbnailUrl;
	}
	public void setThumbnailUrl(String thumbnailUrl) {
		this.thumbnailUrl = thumbnailUrl;
	}
	public Double getRating() {
		return rating;
	}
	public void setRating(Double rating) {
		this.rating = rating;
	}
	
	public String getDescription() {
		return description;
	}
	public void setDescription(String description) {
		this.description = description;
	}
	public Course(Long id, String name, String description, String duration, String thumbnailUrl, Double rating) {
		super();
		this.id = id;
		this.name = name;
		this.description = description;
		this.duration = duration;
		this.thumbnailUrl = thumbnailUrl;
		this.rating = rating;
	}
	public Course() {
	}

    
    
}


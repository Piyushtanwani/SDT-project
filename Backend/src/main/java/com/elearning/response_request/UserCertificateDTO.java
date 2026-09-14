package com.elearning.response_request;

public class UserCertificateDTO {
    private Long userId;
    private String userName;
    private Long courseId;
    private String courseName;
    private double score;

    
    public Long getUserId() {
		return userId;
	}

	public void setUserId(Long userId) {
		this.userId = userId;
	}

	public String getUserName() {
		return userName;
	}

	public void setUserName(String userName) {
		this.userName = userName;
	}

	public Long getCourseId() {
		return courseId;
	}

	public void setCourseId(Long courseId) {
		this.courseId = courseId;
	}

	public String getCourseName() {
		return courseName;
	}

	public void setCourseName(String courseName) {
		this.courseName = courseName;
	}

	public double getScore() {
		return score;
	}

	public void setScore(double score) {
		this.score = score;
	}

	public UserCertificateDTO() {
	}

	public UserCertificateDTO(Long userId, String userName, Long courseId, String courseName, double score) {
        this.userId = userId;
        this.userName = userName;
        this.courseId = courseId;
        this.courseName = courseName;
        this.score = score;
    }
}

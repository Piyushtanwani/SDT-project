package com.elearning.response_request;

import java.util.List;

//DTO to handle incoming update payload
public class UserUpdateDTO {
     private String username;
     private String name;
     private String profileurl;
     private String phonenum;
     private String state;
     private String password;
     private String bio;
     private String role;
     private String timezone;
     private String availability;
     private List<Long> skillIds;

     
     public UserUpdateDTO(String username, String name, String profileurl, String phonenum, String state,
			String password, String bio, String role, String timezone, String availability, List<Long> skillIds) {
		super();
		this.username = username;
		this.name = name;
		this.profileurl = profileurl;
		this.phonenum = phonenum;
		this.state = state;
		this.password = password;
		this.bio = bio;
		this.role = role;
		this.timezone = timezone;
		this.availability = availability;
		this.skillIds = skillIds;
	}
     
	public UserUpdateDTO() {
		// TODO Auto-generated constructor stub
	}

	// Getters and setters
     public String getUsername() { return username; }
     public void setUsername(String username) { this.username = username; }
     public String getName() { return name; }
     public void setName(String name) { this.name = name; }
     public String getProfileurl() { return profileurl; }
     public void setProfileurl(String profileurl) { this.profileurl = profileurl; }
     public String getPhonenum() { return phonenum; }
     public void setPhonenum(String phonenum) { this.phonenum = phonenum; }
     public String getState() { return state; }
     public void setState(String state) { this.state = state; }
     public String getPassword() { return password; }
     public void setPassword(String password) { this.password = password; }
     public String getBio() { return bio; }
     public void setBio(String bio) { this.bio = bio; }
     public String getRole() { return role; }
     public void setRole(String role) { this.role = role; }
     public String getTimezone() { return timezone; }
     public void setTimezone(String timezone) { this.timezone = timezone; }
     public String getAvailability() { return availability; }
     public void setAvailability(String availability) { this.availability = availability; }
     public List<Long> getSkillIds() { return skillIds; }
     public void setSkillIds(List<Long> skillIds) { this.skillIds = skillIds; }
 }


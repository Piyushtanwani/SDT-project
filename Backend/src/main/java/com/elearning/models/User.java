package com.elearning.models;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.*;

import java.util.*;
import java.util.stream.Collectors;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;

@Entity
@Table(name = "users")
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = true, unique = true)
	private String username;
	
	@Column()
	private String name;
	
	@Column()
	private String profileurl;
	
    @Pattern(regexp = "^$|^[0-9]{10,15}$", message = "Phone number must be 10 to 15 digits")
    @Column(nullable = true, unique = true)
    private String phonenum;
	
	
	@Column()
	private String state;

	@Column(nullable = true)
	@JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
	private String password;

	@Email
	@Column(nullable = false, unique = true)
	private String email;

	@Column(nullable = true)
	private String role;

	@Column(nullable = true)
	private boolean enabled = false;

	@JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
	private String otp;
	@JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
	private LocalDateTime otpExpiry;

	private String bio;
	private String timezone;
	private String availability;

	@Column(name = "created_at")
	private LocalDateTime createdAt = LocalDateTime.now();

	@JsonIgnore
	@ManyToMany
	@JoinTable(
			name = "user_skills",
			joinColumns = @JoinColumn(name = "user_id"),
			inverseJoinColumns = @JoinColumn(name = "skill_id")
	)
	private List<Skill> skills = new ArrayList<>();

	@OneToMany(mappedBy = "sender", fetch = FetchType.LAZY)
	@JsonIgnore
	private List<Connection> sentConnections = new ArrayList<>();

	@OneToMany(mappedBy = "receiver", fetch = FetchType.LAZY)
	@JsonIgnore
	private List<Connection> receivedConnections = new ArrayList<>();

	public User(String username, Long id, String name, String profileurl, String phonenum, String state, String password, String email, String role, boolean enabled, String otp, LocalDateTime otpExpiry, String bio, String timezone, String availability, LocalDateTime createdAt, List<Skill> skills, List<Connection> sentConnections, List<Connection> receivedConnections) {
		this.username = username;
		this.id = id;
		this.name = name;
		this.profileurl = profileurl;
		this.phonenum = phonenum;
		this.state = state;
		this.password = password;
		this.email = email;
		this.role = role;
		this.enabled = enabled;
		this.otp = otp;
		this.otpExpiry = otpExpiry;
		this.bio = bio;
		this.timezone = timezone;
		this.availability = availability;
		this.createdAt = createdAt;
		this.skills = skills;
		this.sentConnections = sentConnections;
		this.receivedConnections = receivedConnections;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getProfileurl() {
		return profileurl;
	}

	public void setProfileurl(String profileurl) {
		this.profileurl = profileurl;
	}

	public String getPhonenum() {
		return phonenum;
	}

	public void setPhonenum(String phonenum) {
		this.phonenum = phonenum;
	}

	public String getState() {
		return state;
	}

	public void setState(String state) {
		this.state = state;
	}

	public User() {

	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getRole() {
		return role;
	}

	public void setRole(String role) {
		this.role = role;
	}

	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}

	public String getOtp() {
		return otp;
	}

	public void setOtp(String otp) {
		this.otp = otp;
	}

	public LocalDateTime getOtpExpiry() {
		return otpExpiry;
	}

	public void setOtpExpiry(LocalDateTime otpExpiry) {
		this.otpExpiry = otpExpiry;
	}

	public Collection<? extends GrantedAuthority> getAuthorities() {
		if (role == null || role.isBlank()) {
			return Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
		}
		String auth = role.startsWith("ROLE_") ? role : "ROLE_" + role;
		return Collections.singletonList(new SimpleGrantedAuthority(auth));
	}

	public String getBio() {
		return bio;
	}

	public void setBio(String bio) {
		this.bio = bio;
	}

	public String getTimezone() {
		return timezone;
	}

	public void setTimezone(String timezone) {
		this.timezone = timezone;
	}

	public String getAvailability() {
		return availability;
	}

	public void setAvailability(String availability) {
		this.availability = availability;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public List<Skill> getSkills() {
		return skills;
	}

	public void setSkills(List<Skill> skills) {
		this.skills = skills;
	}

	public List<Connection> getSentConnections() {
		return sentConnections;
	}

	public void setSentConnections(List<Connection> sentConnections) {
		this.sentConnections = sentConnections;
	}

	public List<Connection> getReceivedConnections() {
		return receivedConnections;
	}

	public void setReceivedConnections(List<Connection> receivedConnections) {
		this.receivedConnections = receivedConnections;
	}

	// Helper for skill IDs
	public List<Long> getSkillIds() {
		return skills != null ? skills.stream().map(Skill::getId).collect(Collectors.toList()) : new ArrayList<>();
	}

	public void setSkillIds(List<Long> skillIds) {
		// This is a transient setter for deserialization; actual skill setting is handled in controller
	}
}

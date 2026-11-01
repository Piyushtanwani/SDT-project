package com.elearning;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ELearningBackendApplication {
	public static void main(String[] args) {
		SpringApplication.run(ELearningBackendApplication.class, args);
	}
}
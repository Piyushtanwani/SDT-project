package com.elearning.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Autowired
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendEmail(String to, String subject, String message) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(to);
            mailMessage.setSubject(subject);
            mailMessage.setText(message);
            mailMessage.setFrom("your-email@example.com"); // Replace with your sender email address

            mailSender.send(mailMessage);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }

    public void sendOtpEmail(String to, String otp) {
        String subject = "Your OTP for Learn Without Limits";
        String message = """
                Dear User,

                Your One-Time Password (OTP) for account verification is: %s

                This OTP is valid for 10 minutes. Please use it to complete your registration.

                If you didn't request this, please ignore this email.

                Regards,
                Learn Without Limits Team
                """.formatted(otp);

        sendEmail(to, subject, message);
    }
}

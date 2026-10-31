package com.elearning.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final boolean logFallback;

    @Autowired
    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.from:no-reply@localhost}") String fromAddress,
            @Value("${app.mail.log-fallback:false}") boolean logFallback) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.logFallback = logFallback;
    }

    public void sendEmail(String to, String subject, String message) {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(to);
            mailMessage.setSubject(subject);
            mailMessage.setText(message);
            if (fromAddress != null && !fromAddress.isBlank()) {
                mailMessage.setFrom(fromAddress);
            }

            mailSender.send(mailMessage);
        } catch (Exception e) {
            if (logFallback) {
                // Local development fallback: surface the message in the server log so the
                // flow stays usable without SMTP credentials.
                System.err.println("[mail-fallback] To: " + to + " | Subject: " + subject);
                System.err.println(message);
                return;
            }
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    public void sendOtpEmail(String to, String otp) {
        String subject = "Your OTP for Learn Without Limits";
        String message = """
                Dear User,

                Your One-Time Password (OTP) for account verification is: %s

                This OTP is valid for 5 minutes. Please use it to complete your registration.

                If you didn't request this, please ignore this email.

                Regards,
                Learn Without Limits Team
                """.formatted(otp);

        sendEmail(to, subject, message);
    }
}

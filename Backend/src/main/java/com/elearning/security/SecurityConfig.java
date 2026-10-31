package com.elearning.security;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.elearning.services.CustomUserDetailsService;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;

    @Value("${app.frontendurl}")
    private String frontendUrl;

    public SecurityConfig(CustomUserDetailsService userDetailsService, JwtService jwtService) {
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        // Public authentication & onboarding endpoints
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/verify-otp",
                                "/api/auth/resend-otp/**",
                                "/api/auth/google-auth"
                        ).permitAll()
                        // Public course & module viewing
                        .requestMatchers(HttpMethod.GET,
                                "/course/getCourses",
                                "/course/getCourseName/**",
                                "/course/getCourseById/**",
                                "/module/course/**",
                                "/module/**"
                        ).permitAll()
                        // Public certificate verification and leaderboard
                        .requestMatchers(HttpMethod.GET,
                                "/api/certificates/credential/**",
                                "/api/certificates/leaderboard"
                        ).permitAll()
                        // Public offline assistant and messaging webhooks (webhooks authenticate themselves)
                        .requestMatchers(
                                "/api/assistant/**",
                                "/webhooks/**"
                        ).permitAll()
                        // Public WebSocket handshake & docs / static assets
                        .requestMatchers(
                                "/ws/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/Uploads/**",
                                "/uploads/**",
                                "/ProfilePhotos/**",
                                "/profilephotos/**",
                                "/error"
                        ).permitAll()
                        // Admin-only course, module, question, and user management
                        .requestMatchers(
                                "/course/add",
                                "/course/deletecourse/**",
                                "/module/add/**",
                                "/module/update/**",
                                "/module/delete/**",
                                "/api/questions/add",
                                "/api/questions/course/**",
                                "/api/admin/**",
                                "/api/auth/getallusers",
                                "/api/auth/deleteuser/**",
                                "/api/auth/updateuser/**"
                        ).hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/skills/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/skills/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/skills/**").hasRole("ADMIN")
                        // All other endpoints require authentication
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"success\":false,\"message\":\"Authentication required.\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"success\":false,\"message\":\"You do not have permission to perform this action.\"}");
                        })
                )
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://*.bitecodes.com",
                "https://bitecodes.com",
                frontendUrl != null ? frontendUrl : "*"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtService, userDetailsService);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }
}
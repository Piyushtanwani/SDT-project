package com.elearning;

import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import com.elearning.security.JwtAuthenticationFilter;
import com.elearning.security.JwtService;
import com.elearning.services.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AccountStatusTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private User user(boolean enabled) {
        User user = new User();
        user.setEmail("learner@example.com");
        user.setPassword("hashed");
        user.setRole("USER");
        user.setEnabled(enabled);
        return user;
    }

    private CustomUserDetailsService userDetailsService(User user) {
        CustomUserDetailsService service = new CustomUserDetailsService();
        UserRepository repository = mock(UserRepository.class);
        when(repository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        ReflectionTestUtils.setField(service, "userRepository", repository);
        return service;
    }

    @Test
    @DisplayName("Disabled accounts are marked disabled in UserDetails")
    void disabledAccountPropagatesToUserDetails() {
        UserDetails details = userDetailsService(user(false)).loadUserByUsername("learner@example.com");
        assertFalse(details.isEnabled());
        assertTrue(details.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    @DisplayName("Enabled accounts are marked enabled in UserDetails")
    void enabledAccountPropagatesToUserDetails() {
        UserDetails details = userDetailsService(user(true)).loadUserByUsername("learner@example.com");
        assertTrue(details.isEnabled());
    }

    @Test
    @DisplayName("A token for a disabled account does not authenticate the request")
    void disabledAccountTokenIsNotAuthenticated() throws Exception {
        JwtService jwtService = new JwtService("unit-test-secret-key-with-at-least-32-bytes!!", 60_000);
        String token = jwtService.generateToken("learner@example.com", 7L);

        JwtAuthenticationFilter filter =
                new JwtAuthenticationFilter(jwtService, userDetailsService(user(false)));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);

        filter.doFilter(request, new MockHttpServletResponse(), mock(FilterChain.class));

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("A token for an enabled account authenticates the request")
    void enabledAccountTokenIsAuthenticated() throws Exception {
        JwtService jwtService = new JwtService("unit-test-secret-key-with-at-least-32-bytes!!", 60_000);
        String token = jwtService.generateToken("learner@example.com", 7L);

        JwtAuthenticationFilter filter =
                new JwtAuthenticationFilter(jwtService, userDetailsService(user(true)));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);

        filter.doFilter(request, new MockHttpServletResponse(), mock(FilterChain.class));

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("learner@example.com", SecurityContextHolder.getContext().getAuthentication().getName());
    }
}

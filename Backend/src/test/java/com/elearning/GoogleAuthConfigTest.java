package com.elearning;

import com.elearning.controller.AuthController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the two Google sign-in failures an operator can hit without contacting Google:
 * an empty client id, and a request that carries no credential. Both branches return
 * before any dependency is touched, so the controller is built with empty collaborators.
 */
class GoogleAuthConfigTest {

    private static final String CLIENT_ID = "758102529675-tjpsc3j5qd5rqun6hk8jbgf270ncu43q.apps.googleusercontent.com";

    private MockMvc mvcWithClientId(String clientId) {
        AuthController controller = new AuthController(null, null, null, null, null, null, null, null, null, null);
        ReflectionTestUtils.setField(controller, "googleClientId", clientId);
        return MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("GOOG-01: a blank client id answers 503 instead of silently failing sign-in")
    void blankClientIdExplainsSignInIsOff() throws Exception {
        mvcWithClientId("").perform(post("/api/auth/google-auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credential\":\"whatever-the-button-sent\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().json("{\"message\":\"Google sign-in is not configured on this server.\"}"));
    }

    @Test
    @DisplayName("GOOG-02: a request with no credential is refused as a client error, never a 500")
    void missingCredentialIsRefused() throws Exception {
        mvcWithClientId(CLIENT_ID).perform(post("/api/auth/google-auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"someone@example.com\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"success\":false}"));
    }

    @Test
    @DisplayName("GOOG-03: a whitespace-only credential counts as absent")
    void blankCredentialIsRefused() throws Exception {
        mvcWithClientId(CLIENT_ID).perform(post("/api/auth/google-auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credential\":\"   \"}"))
                .andExpect(status().isUnauthorized());
    }
}

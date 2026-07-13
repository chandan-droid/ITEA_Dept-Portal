package com.msil.iteadeptportal.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.msil.iteadeptportal.auth.dto.LoginRequest;
import com.msil.iteadeptportal.auth.dto.LoginResponse;
import com.msil.iteadeptportal.auth.exception.DepartmentAuthorizationException;
import com.msil.iteadeptportal.auth.exception.RateLimitExceededException;
import com.msil.iteadeptportal.auth.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    public void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(authController).build();
    }

    @Test
    public void testLogin_Success() throws Exception {
        LoginResponse response = LoginResponse.builder()
                .token("test-token")
                .email("dev@company.com")
                .name("Dev")
                .role("ROLE_PORTAL_USER")
                .build();
        when(authService.authenticate(any(LoginRequest.class), any(), any())).thenReturn(response);

        LoginRequest request = new LoginRequest("dev", "password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.data.token").value("test-token"))
                .andExpect(jsonPath("$.data.email").value("dev@company.com"))
                .andExpect(jsonPath("$.data.role").value("ROLE_PORTAL_USER"));
    }

    @Test
    public void testLogin_Unauthorized() throws Exception {
        when(authService.authenticate(any(LoginRequest.class), any(), any()))
                .thenThrow(new IllegalArgumentException("Invalid username or password"));

        LoginRequest request = new LoginRequest("dev", "wrong-password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    public void testLogin_Forbidden() throws Exception {
        when(authService.authenticate(any(LoginRequest.class), any(), any()))
                .thenThrow(new DepartmentAuthorizationException("Access Denied: User is not a member of department DE_CGV4"));

        LoginRequest request = new LoginRequest("john", "password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Access Denied: User is not a member of department DE_CGV4"));
    }

    @Test
    public void testLogin_TooManyRequests() throws Exception {
        when(authService.authenticate(any(LoginRequest.class), any(), any()))
                .thenThrow(new RateLimitExceededException("Too many requests. Please try again later."));

        LoginRequest request = new LoginRequest("dev", "password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Too many requests. Please try again later."));
    }
}

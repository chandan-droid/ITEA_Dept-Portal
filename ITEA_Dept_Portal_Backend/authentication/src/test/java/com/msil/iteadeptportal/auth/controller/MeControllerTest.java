package com.msil.iteadeptportal.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.employee.api.UserMeDTO;
import com.msil.iteadeptportal.employee.api.RoleDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class MeControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserFacade userFacade;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private MeController meController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    public void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(meController).build();
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    public void testGetCurrentUser_Success() throws Exception {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken("dev", "credentials", List.of());
        when(securityContext.getAuthentication()).thenReturn(auth);

        UserDTO userDto = UserDTO.builder()
                .userId(1L)
                .employeeId("1001")
                .samAccountName("dev")
                .email("dev@msil.co.in")
                .role("ROLE_USER")
                .build();

        UserMeDTO meDto = UserMeDTO.builder()
                .user(userDto)
                .roles(List.of(new RoleDTO(1L, "ROLE_USER")))
                .permissions(Map.of("Dashboard", List.of("VIEW")))
                .build();

        when(userFacade.getUserMeDetails("dev")).thenReturn(meDto);

        mockMvc.perform(get("/api/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.samAccountName").value("dev"))
                .andExpect(jsonPath("$.data.roles[0].roleName").value("ROLE_USER"))
                .andExpect(jsonPath("$.data.permissions.Dashboard[0]").value("VIEW"));
    }

    @Test
    public void testGetCurrentUser_Unauthorized() throws Exception {
        when(securityContext.getAuthentication()).thenReturn(null);

        mockMvc.perform(get("/api/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    public void testGetCurrentUser_NotFound() throws Exception {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken("unknown", "credentials", List.of());
        when(securityContext.getAuthentication()).thenReturn(auth);

        when(userFacade.getUserMeDetails("unknown")).thenThrow(new IllegalArgumentException("User not found"));

        mockMvc.perform(get("/api/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("User not found"));
    }
}

package com.msil.iteadeptportal.employee.controller;


import com.msil.iteadeptportal.employee.api.EmployeeDetailsDTO;
import com.msil.iteadeptportal.employee.api.EmployeeSummaryDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class EmployeeControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserFacade userFacade;

    @InjectMocks
    private EmployeeController employeeController;



    @BeforeEach
    public void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(employeeController).build();
    }

    @Test
    public void testListEmployees_Success() throws Exception {
        EmployeeSummaryDTO employee = EmployeeSummaryDTO.builder()
                .userId(1L)
                .employeeId("1001")
                .displayName("Dev Kumar")
                .email("dev@msil.co.in")
                .roles(List.of("ROLE_USER"))
                .status("ACTIVE")
                .lastLoginAt(LocalDateTime.now())
                .build();

        PaginatedResponse<EmployeeSummaryDTO> response = PaginatedResponse.<EmployeeSummaryDTO>builder()
                .content(List.of(employee))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .build();

        when(userFacade.listEmployees(anyInt(), anyInt(), any(), any(), any(), anyString()))
                .thenReturn(response);

        mockMvc.perform(get("/api/employees")
                        .param("page", "0")
                        .param("size", "20")
                        .param("search", "dev")
                        .param("role", "ROLE_USER")
                        .param("status", "ACTIVE")
                        .param("sort", "displayName,asc")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].employeeId").value("1001"))
                .andExpect(jsonPath("$.data.content[0].displayName").value("Dev Kumar"))
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    public void testGetEmployeeDetails_AsAdmin_ReturnsRoles() throws Exception {
        EmployeeDetailsDTO details = EmployeeDetailsDTO.builder()
                .userId(1L)
                .employeeId("1001")
                .displayName("Dev Kumar")
                .email("dev@msil.co.in")
                .status("ACTIVE")
                .roles(List.of("ROLE_USER"))
                .permissions(List.of("EMPLOYEE_VIEW_DETAILS"))
                .createdAt(LocalDateTime.now())
                .build();

        when(userFacade.getEmployeeDetails(1L)).thenReturn(details);

        // Mock security context as ADMIN
        org.springframework.security.core.Authentication auth = mock(org.springframework.security.core.Authentication.class);
        doReturn(List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")))
                .when(auth).getAuthorities();
        SecurityContextHolder.getContext().setAuthentication(auth);

        mockMvc.perform(get("/api/employees/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.employeeId").value("1001"))
                .andExpect(jsonPath("$.data.roles").isArray())
                .andExpect(jsonPath("$.data.roles[0]").value("ROLE_USER"));
    }

    @Test
    public void testGetEmployeeDetails_AsNonAdmin_HidesRoles() throws Exception {
        EmployeeDetailsDTO details = EmployeeDetailsDTO.builder()
                .userId(1L)
                .employeeId("1001")
                .displayName("Dev Kumar")
                .email("dev@msil.co.in")
                .status("ACTIVE")
                .roles(List.of("ROLE_USER"))
                .permissions(List.of("EMPLOYEE_VIEW_DETAILS"))
                .createdAt(LocalDateTime.now())
                .build();

        when(userFacade.getEmployeeDetails(1L)).thenReturn(details);

        // Mock security context as non-ADMIN
        org.springframework.security.core.Authentication auth = mock(org.springframework.security.core.Authentication.class);
        doReturn(List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")))
                .when(auth).getAuthorities();
        SecurityContextHolder.getContext().setAuthentication(auth);

        mockMvc.perform(get("/api/employees/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.employeeId").value("1001"))
                .andExpect(jsonPath("$.data.roles").value((Object) null));
    }

    @Test
    public void testActivateUser_Success() throws Exception {
        mockMvc.perform(put("/api/employees/1/activate")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User activated successfully"));
    }

    @Test
    public void testDeactivateUser_Success() throws Exception {
        mockMvc.perform(put("/api/employees/1/deactivate")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User deactivated successfully"));
    }
}

package com.msil.iteadeptportal.employee.controller;

import com.msil.iteadeptportal.employee.api.EmployeeDetailsDTO;
import com.msil.iteadeptportal.employee.api.EmployeeSummaryDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.shared.api.ApiResponse;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final UserFacade userFacade;

    @GetMapping
    @PreAuthorize("hasAuthority('EMPLOYEE_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<PaginatedResponse<EmployeeSummaryDTO>>> listEmployees(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "sort", defaultValue = "displayName,asc") String sort) {

        PaginatedResponse<EmployeeSummaryDTO> result = userFacade.listEmployees(page, size, search, role, status, sort);
        return ResponseEntity.ok(ApiResponse.success(result, "Employees retrieved successfully"));
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAuthority('EMPLOYEE_VIEW_DETAILS')")
    public ResponseEntity<ApiResponse<EmployeeDetailsDTO>> getEmployeeDetails(@PathVariable("userId") Long userId) {
        EmployeeDetailsDTO result = userFacade.getEmployeeDetails(userId);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin) {
            result.setRoles(null);
        }

        return ResponseEntity.ok(ApiResponse.success(result, "Employee details retrieved successfully"));
    }

    @PutMapping("/{userId}/activate")
    @PreAuthorize("hasAuthority('USER_ACTIVATE')")
    public ResponseEntity<ApiResponse<Void>> activateUser(@PathVariable("userId") Long userId) {
        userFacade.activateUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "User activated successfully"));
    }

    @PutMapping("/{userId}/deactivate")
    @PreAuthorize("hasAuthority('USER_DEACTIVATE')")
    public ResponseEntity<ApiResponse<Void>> deactivateUser(@PathVariable("userId") Long userId) {
        userFacade.deactivateUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "User deactivated successfully"));
    }
}

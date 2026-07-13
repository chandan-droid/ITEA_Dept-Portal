package com.msil.iteadeptportal.employee.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private Long userId;
    private String employeeId;
    private String samAccountName;
    private String userPrincipalName;
    private String displayName;
    private String surname;
    private String email;
    private String status;
    private Boolean firstLogin;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String role; // Primary mapped portal role
}

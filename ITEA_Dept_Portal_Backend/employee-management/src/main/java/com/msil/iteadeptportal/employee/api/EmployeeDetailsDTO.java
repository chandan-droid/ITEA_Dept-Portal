package com.msil.iteadeptportal.employee.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeDetailsDTO {
    private Long userId;
    private String employeeId;
    private String displayName;
    private String email;
    private String status;
    private List<String> roles;
    private List<String> permissions;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
}

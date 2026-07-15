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
public class EmployeeSummaryDTO {
    private Long userId;
    private String employeeId;
    private String displayName;
    private String email;
    private List<String> roles;
    private String status;
    private LocalDateTime lastLoginAt;
}

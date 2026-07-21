package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class WfhRequestDTO {
    private Long wfhRequestId;
    private Long userId;
    private String employeeId;
    private String employeeName;
    private String email;
    private LocalDate wfhDate;
    private String reason;
    private String status;   // PENDING, APPROVED, REJECTED, CANCELLED
    private LocalDateTime createdAt;
}

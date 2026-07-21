package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaveRequestDTO {
    private Long leaveRequestId;
    private Long leaveTypeId;
    private String leaveTypeName;
    private Long userId;
    private String employeeId;
    private String employeeName;
    private String email;
    private LocalDate fromDate;
    private LocalDate toDate;
    private Integer totalDays;
    private String reason;
    private String status;       // PENDING, APPROVED, REJECTED, CANCELLED
    private String rejectionReason;
    private LocalDateTime createdAt;
}

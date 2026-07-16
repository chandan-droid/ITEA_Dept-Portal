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
    private LocalDate fromDate;
    private LocalDate toDate;
    private String reason;
    private String status;       // PENDING, APPROVED, REJECTED
    private String rejectionReason;
    private LocalDateTime createdAt;
}

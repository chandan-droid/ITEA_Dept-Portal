package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AttendanceReportDTO {
    private String employeeId;
    private String employeeName;
    private AttendanceSummaryDTO summary;
    private Long workingMinutes;
}

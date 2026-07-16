package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AttendanceHistoryDTO {
    private LocalDate attendanceDate;
    private String status;
    private Integer workingMinutes;
    private String checkInTime;
    private String checkOutTime;
}

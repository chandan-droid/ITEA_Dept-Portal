package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TodayAttendanceDTO {
    private LocalDate attendanceDate;
    private String checkInTime;   // HH:mm format, null if not checked in
    private String checkOutTime;  // HH:mm format, null if not checked out
    private Integer workingMinutes;
    private String status;        // PRESENT, HALF_DAY, NOT_CHECKED_IN
}

package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AttendanceSearchResultDTO {
    private String employeeId;
    private String employeeName;
    private LocalDate date;
    private String status;
    private Integer workingMinutes;
}

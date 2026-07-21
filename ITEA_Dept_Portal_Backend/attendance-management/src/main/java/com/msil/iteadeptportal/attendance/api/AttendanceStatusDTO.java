package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceStatusDTO {
    private Boolean isCheckedIn;
    private Boolean isCheckedOut;
    private String workingHours;
    private String currentSessionDuration;
    private String status;
}

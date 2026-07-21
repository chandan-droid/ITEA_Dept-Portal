package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamMemberAttendanceDTO {
    private String employeeId;
    private String employeeName;
    private String status;
    private String checkInTime;
    private String checkOutTime;
    private Integer workingMinutes;
}

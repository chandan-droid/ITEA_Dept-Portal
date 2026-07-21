package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamAttendanceSummaryDTO {
    private long totalPresent;
    private long totalAbsent;
    private long totalLeave;
    private long totalWfh;
    private long totalCheckedIn;
    private long totalCheckedOut;
}

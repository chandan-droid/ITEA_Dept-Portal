package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AttendanceSummaryDTO {
    private int present;
    private int absent;
    private int leave;
    private int wfh;
    private int halfDay;
}

package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TeamReportEntryDTO {
    private String employeeId;
    private String employeeName;
    private long present;
    private long absent;
    private long leave;
    private long wfh;
    private long halfDay;
    private long workingMinutes;
}

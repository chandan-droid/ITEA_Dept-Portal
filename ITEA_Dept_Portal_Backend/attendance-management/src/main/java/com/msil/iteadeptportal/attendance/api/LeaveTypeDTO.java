package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaveTypeDTO {
    private Long leaveTypeId;
    private String typeName;
    private String description;
    private Integer maxDaysPerYear;
}

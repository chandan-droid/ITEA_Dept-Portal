package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class HolidayDTO {
    private Long holidayId;
    private LocalDate holidayDate;
    private String holidayName;
    private Boolean isOptional;
}

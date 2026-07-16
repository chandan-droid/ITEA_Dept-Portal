package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CalendarDayDTO {
    private LocalDate date;
    private String status; // PRESENT, HALF_DAY, ABSENT, LEAVE, WFH, HOLIDAY, WEEKEND
}

package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CheckOutResponse {
    private String  message;
    private Integer workingMinutes;
    private String  attendanceStatus;
    /** The IP address recorded at check-out */
    private String  checkOutIp;
    /** The GPS location recorded at check-out (lat,lon) or null */
    private String  checkOutLocation;
}

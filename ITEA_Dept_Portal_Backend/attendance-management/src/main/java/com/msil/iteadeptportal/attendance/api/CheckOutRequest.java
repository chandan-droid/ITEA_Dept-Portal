package com.msil.iteadeptportal.attendance.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CheckOutRequest {
    /** GPS latitude at time of check-out (optional — from browser Geolocation API) */
    private Double latitude;
    /** GPS longitude at time of check-out (optional — from browser Geolocation API) */
    private Double longitude;
}

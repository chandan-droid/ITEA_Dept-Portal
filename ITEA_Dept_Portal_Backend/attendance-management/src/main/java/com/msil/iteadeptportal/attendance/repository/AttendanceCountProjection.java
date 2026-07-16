package com.msil.iteadeptportal.attendance.repository;

/** Projection for GROUP BY status count query. */
public interface AttendanceCountProjection {
    String getStatus();
    Long getCnt();
}

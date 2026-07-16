package com.msil.iteadeptportal.attendance.repository;

/** Projection for team attendance query (LEFT JOIN users with attendance_records for a date). */
public interface TeamAttendanceProjection {
    String getEmployeeId();
    String getDisplayName();
    String getStatus();
}

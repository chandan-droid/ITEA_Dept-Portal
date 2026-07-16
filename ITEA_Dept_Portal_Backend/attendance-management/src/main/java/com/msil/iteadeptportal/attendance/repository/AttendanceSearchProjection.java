package com.msil.iteadeptportal.attendance.repository;

/** Projection for cross-table attendance search (attendance_records JOIN users). */
public interface AttendanceSearchProjection {
    Long getAttendanceId();
    String getEmployeeId();
    String getDisplayName();
    java.time.LocalDate getAttendanceDate();
    String getAttendanceStatus();
    Integer getWorkingMinutes();
}

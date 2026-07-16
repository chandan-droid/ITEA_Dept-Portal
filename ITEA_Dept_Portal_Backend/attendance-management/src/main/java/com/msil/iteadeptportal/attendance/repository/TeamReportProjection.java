package com.msil.iteadeptportal.attendance.repository;

/** Projection for team report aggregate query. */
public interface TeamReportProjection {
    String getEmployeeId();
    String getDisplayName();
    Long getPresentCount();
    Long getAbsentCount();
    Long getLeaveCount();
    Long getWfhCount();
    Long getHalfDayCount();
    Long getTotalWorkingMinutes();
}

package com.msil.iteadeptportal.shared.calendar;

/**
 * Calendar event source types used for aggregation and color-coding.
 * Priority order for same-day sorting: ATTENDANCE(1) > LEAVE(2) > WFH(3) > PROJECT(4) > TASK(5) > HOLIDAY(6) > ANNOUNCEMENT(7)
 */
public enum CalendarEventType {
    ATTENDANCE,
    LEAVE,
    WFH,
    TASK,
    PROJECT,
    HOLIDAY,
    ANNOUNCEMENT
}

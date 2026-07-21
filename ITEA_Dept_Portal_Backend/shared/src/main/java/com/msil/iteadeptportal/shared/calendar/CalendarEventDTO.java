package com.msil.iteadeptportal.shared.calendar;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Unified calendar event DTO returned by the Calendar API.
 * All events from all modules are mapped into this common structure.
 * The Calendar module never persists any data; this is a read-only view model.
 */
@Data
@Builder
public class CalendarEventDTO {

    /** Unique identifier – sourced from the originating entity's PK. */
    private Long id;

    /** Short display title shown in the calendar cell. */
    private String title;

    /** Longer description shown in the event detail popup. */
    private String description;

    /** Event source type used for filtering and color-coding. */
    private CalendarEventType type;

    /** Start of the event (or date-only for all-day events). */
    private LocalDateTime startDateTime;

    /** End of the event – null for point-in-time events like check-in. */
    private LocalDateTime endDateTime;

    /** True for Leave, WFH, Holiday, Announcement – no specific time. */
    private boolean allDay;

    /** Hex color string for the event chip/pill in the calendar view. */
    private String color;

    /** Material icon name / emoji used beside the title. */
    private String icon;

    /** The originating module entity type (e.g. "ATTENDANCE", "TASK"). */
    private String referenceType;

    /** The originating entity's ID for deep-link navigation. */
    private Long referenceId;

    /** Frontend route to navigate to when the event is clicked. */
    private String actionUrl;
}

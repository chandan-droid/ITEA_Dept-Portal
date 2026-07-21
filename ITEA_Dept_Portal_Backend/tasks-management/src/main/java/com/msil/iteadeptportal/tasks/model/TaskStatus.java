package com.msil.iteadeptportal.tasks.model;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public enum TaskStatus {
    TODO,
    IN_PROGRESS,
    UNDER_REVIEW,
    COMPLETED,
    ON_HOLD,
    CANCELLED,
    ARCHIVED;

    /**
     * Parse input string into valid TaskStatus, mapping legacy names like IN_REVIEW -> UNDER_REVIEW and BLOCKED -> ON_HOLD.
     */
    public static TaskStatus fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return TODO;
        }
        String normalized = value.trim().toUpperCase();
        if ("UNDER_REVIEW".equals(normalized)) {
            return UNDER_REVIEW;
        }
        if ("BLOCKED".equals(normalized)) {
            return ON_HOLD;
        }
        if ("APPROVED".equals(normalized)) {
            return COMPLETED;
        }
        try {
            return TaskStatus.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            return TODO;
        }
    }

    public static boolean isValid(String value) {
        if (value == null) return false;
        String normalized = value.trim().toUpperCase();
        if ("UNDER_REVIEW".equals(normalized) || "BLOCKED".equals(normalized) || "APPROVED".equals(normalized)) {
            return true;
        }
        try {
            TaskStatus.valueOf(normalized);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public static List<String> getAllStatuses() {
        return Arrays.stream(values()).map(Enum::name).collect(Collectors.toList());
    }
}

package com.msil.iteadeptportal.shared.event;

import java.util.List;

/**
 * Generic domain notification event published asynchronously by business modules.
 */
public record NotificationEvent(
    List<Long> recipientUserIds,
    String notificationType, // TASK, PROJECT, ATTENDANCE, LEAVE, WFH, SYSTEM, ANNOUNCEMENT
    String title,
    String message,
    String referenceType,
    Long referenceId,
    Long actorUserId
) {
    public NotificationEvent(List<Long> recipientUserIds, String notificationType, String title, String message, String referenceType, Long referenceId) {
        this(recipientUserIds, notificationType, title, message, referenceType, referenceId, null);
    }
}

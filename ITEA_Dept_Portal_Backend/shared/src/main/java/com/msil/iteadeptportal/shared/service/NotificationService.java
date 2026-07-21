package com.msil.iteadeptportal.shared.service;

import com.msil.iteadeptportal.shared.api.ApiResponse;
import com.msil.iteadeptportal.shared.api.BadRequestException;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import com.msil.iteadeptportal.shared.api.ResourceNotFoundException;
import com.msil.iteadeptportal.shared.event.NotificationEvent;
import com.msil.iteadeptportal.shared.model.Notification;
import com.msil.iteadeptportal.shared.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public PaginatedResponse<Notification> getNotifications(Long userId, String type, Boolean read, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Notification> pageResult;

        if (type != null && !type.isBlank() && read != null) {
            pageResult = notificationRepository.findByRecipientUserIdAndNotificationTypeAndIsRead(userId, type.toUpperCase(), read, pageable);
        } else if (type != null && !type.isBlank()) {
            pageResult = notificationRepository.findByRecipientUserIdAndNotificationType(userId, type.toUpperCase(), pageable);
        } else if (read != null) {
            pageResult = notificationRepository.findByRecipientUserIdAndIsRead(userId, read, pageable);
        } else {
            pageResult = notificationRepository.findByRecipientUserId(userId, pageable);
        }

        return PaginatedResponse.from(pageResult);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByRecipientUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findByNotificationIdAndRecipientUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + notificationId));

        if (!notification.getIsRead()) {
            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadForUser(userId, LocalDateTime.now());
    }

    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findByNotificationIdAndRecipientUserId(notificationId, userId)
                .orElse(null);
        if (notification != null) {
            notificationRepository.delete(notification);
        }
    }

    /**
     * Called by NotificationEventListener to persist notifications and send STOMP WebSockets.
     */
    @Transactional
    public void processEvent(NotificationEvent event) {
        if (event.recipientUserIds() == null || event.recipientUserIds().isEmpty()) {
            return;
        }

        List<Long> recipients = event.recipientUserIds().stream()
                .filter(id -> id != null)
                .filter(id -> event.actorUserId() == null || !id.equals(event.actorUserId()))
                .distinct()
                .toList();
        for (Long recipientId : recipients) {
            try {
                Notification notif = Notification.builder()
                        .recipientUserId(recipientId)
                        .notificationType(event.notificationType())
                        .title(event.title())
                        .message(event.message())
                        .referenceType(event.referenceType())
                        .referenceId(event.referenceId())
                        .isRead(false)
                        .build();

                notif = notificationRepository.save(notif);

                // Push WebSocket STOMP message to /user/{recipientId}/queue/notifications
                try {
                    messagingTemplate.convertAndSendToUser(
                            String.valueOf(recipientId),
                            "/queue/notifications",
                            notif
                    );
                } catch (Exception wsEx) {
                    log.warn("Failed to push STOMP WebSocket notification to user {}: {}", recipientId, wsEx.getMessage());
                }
            } catch (Exception ex) {
                log.error("Failed to save notification for user {}: {}", recipientId, ex.getMessage());
            }
        }
    }
}

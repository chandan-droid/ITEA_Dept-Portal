package com.msil.iteadeptportal.shared.repository;

import com.msil.iteadeptportal.shared.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientUserId(Long recipientUserId, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndNotificationType(Long recipientUserId, String notificationType, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndIsRead(Long recipientUserId, Boolean isRead, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndNotificationTypeAndIsRead(Long recipientUserId, String notificationType, Boolean isRead, Pageable pageable);

    long countByRecipientUserIdAndIsReadFalse(Long recipientUserId);

    Optional<Notification> findByNotificationIdAndRecipientUserId(Long notificationId, Long recipientUserId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :now WHERE n.recipientUserId = :userId AND n.isRead = false")
    void markAllAsReadForUser(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}

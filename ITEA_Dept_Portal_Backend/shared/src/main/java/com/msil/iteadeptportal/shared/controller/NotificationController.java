package com.msil.iteadeptportal.shared.controller;

import com.msil.iteadeptportal.shared.api.ApiResponse;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import com.msil.iteadeptportal.shared.model.Notification;
import com.msil.iteadeptportal.shared.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JdbcTemplate jdbcTemplate;

    private Long resolveUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT user_id FROM users WHERE sam_account_name = ?",
                    Long.class,
                    username
            );
        } catch (Exception e) {
            throw new IllegalStateException("Authenticated user not found: " + username);
        }
    }

    // ─── GET /api/notifications ────────────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasAuthority('NOTIFICATION_VIEW')")
    public ResponseEntity<ApiResponse<PaginatedResponse<Notification>>> getNotifications(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean read,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = resolveUserId();
        PaginatedResponse<Notification> result = notificationService.getNotifications(userId, type, read, page, size);
        return ResponseEntity.ok(ApiResponse.success(result, "Notifications retrieved successfully."));
    }

    // ─── GET /api/notifications/unread-count ───────────────────────────────────
    @GetMapping("/unread-count")
    @PreAuthorize("hasAuthority('NOTIFICATION_VIEW')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        Long userId = resolveUserId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count), "Unread notification count retrieved."));
    }

    // ─── PATCH /api/notifications/{id}/read ───────────────────────────────────
    @PatchMapping("/{id}/read")
    @PreAuthorize("hasAuthority('NOTIFICATION_MARK_READ')")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable("id") Long id) {
        Long userId = resolveUserId();
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Notification marked as read."));
    }

    // ─── PATCH /api/notifications/read-all ────────────────────────────────────
    @PatchMapping("/read-all")
    @PreAuthorize("hasAuthority('NOTIFICATION_MARK_READ')")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        Long userId = resolveUserId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "All notifications marked as read."));
    }

    // ─── DELETE /api/notifications/{id} ───────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('NOTIFICATION_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable("id") Long id) {
        Long userId = resolveUserId();
        notificationService.deleteNotification(id, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Notification deleted."));
    }
}

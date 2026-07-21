package com.msil.iteadeptportal.shared.controller;

import com.msil.iteadeptportal.shared.api.ApiResponse;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import com.msil.iteadeptportal.shared.model.Announcement;
import com.msil.iteadeptportal.shared.service.AnnouncementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;
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

    private boolean isAdminUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ANNOUNCEMENT_CREATE") || a.equals("ROLE_ADMIN"));
    }

    // ─── POST /api/announcements — Create Announcement (Draft) ───────────────
    @PostMapping
    @PreAuthorize("hasAuthority('ANNOUNCEMENT_CREATE')")
    public ResponseEntity<ApiResponse<Announcement>> createAnnouncement(
            @RequestBody AnnouncementService.CreateAnnouncementRequest request) {
        Long userId = resolveUserId();
        Announcement announcement = announcementService.createAnnouncement(request, userId);
        return ResponseEntity.ok(ApiResponse.success(announcement, "Announcement draft created successfully."));
    }

    // ─── PUT /api/announcements/{id} — Update Announcement ─────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ANNOUNCEMENT_UPDATE')")
    public ResponseEntity<ApiResponse<Announcement>> updateAnnouncement(
            @PathVariable("id") Long id,
            @RequestBody AnnouncementService.UpdateAnnouncementRequest request) {
        Long userId = resolveUserId();
        Announcement announcement = announcementService.updateAnnouncement(id, request, userId);
        return ResponseEntity.ok(ApiResponse.success(announcement, "Announcement updated successfully."));
    }

    // ─── PATCH /api/announcements/{id}/publish — Publish Immediately ─────────
    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasAuthority('ANNOUNCEMENT_PUBLISH')")
    public ResponseEntity<ApiResponse<Announcement>> publishAnnouncement(@PathVariable("id") Long id) {
        Long userId = resolveUserId();
        Announcement announcement = announcementService.publishAnnouncement(id, userId);
        return ResponseEntity.ok(ApiResponse.success(announcement, "Announcement published and broadcasted to users."));
    }

    // ─── PATCH /api/announcements/{id}/schedule — Schedule Publication ───────
    @PatchMapping("/{id}/schedule")
    @PreAuthorize("hasAuthority('ANNOUNCEMENT_PUBLISH')")
    public ResponseEntity<ApiResponse<Announcement>> scheduleAnnouncement(
            @PathVariable("id") Long id,
            @RequestBody AnnouncementService.ScheduleAnnouncementRequest request) {
        Long userId = resolveUserId();
        Announcement announcement = announcementService.scheduleAnnouncement(id, request, userId);
        return ResponseEntity.ok(ApiResponse.success(announcement, "Announcement scheduled for publication."));
    }

    // ─── PATCH /api/announcements/{id}/archive — Archive Announcement ─────────
    @PatchMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('ANNOUNCEMENT_ARCHIVE')")
    public ResponseEntity<ApiResponse<Announcement>> archiveAnnouncement(@PathVariable("id") Long id) {
        Long userId = resolveUserId();
        Announcement announcement = announcementService.archiveAnnouncement(id, userId);
        return ResponseEntity.ok(ApiResponse.success(announcement, "Announcement archived."));
    }

    // ─── DELETE /api/announcements/{id} — Delete Announcement ─────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ANNOUNCEMENT_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteAnnouncement(@PathVariable("id") Long id) {
        Long userId = resolveUserId();
        announcementService.deleteAnnouncement(id, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Announcement deleted."));
    }

    // ─── GET /api/announcements — List Announcements ─────────────────────────
    @GetMapping
    @PreAuthorize("hasAuthority('ANNOUNCEMENT_VIEW')")
    public ResponseEntity<ApiResponse<PaginatedResponse<Announcement>>> getAnnouncements(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        boolean isAdmin = isAdminUser();
        PaginatedResponse<Announcement> result = announcementService.getAnnouncements(isAdmin, status, page, size);
        return ResponseEntity.ok(ApiResponse.success(result, "Announcements retrieved."));
    }

    // ─── GET /api/announcements/{id} — Announcement Details ───────────────────
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ANNOUNCEMENT_VIEW')")
    public ResponseEntity<ApiResponse<Announcement>> getAnnouncementDetails(@PathVariable("id") Long id) {
        Announcement announcement = announcementService.getAnnouncementDetails(id);
        return ResponseEntity.ok(ApiResponse.success(announcement, "Announcement details retrieved."));
    }
}

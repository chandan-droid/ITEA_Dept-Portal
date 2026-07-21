package com.msil.iteadeptportal.shared.calendar;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * REST controller for the Calendar aggregation API.
 *
 * Endpoints:
 *   GET /api/calendar            – Events within a date range
 *   GET /api/calendar/today      – Today's events
 *   GET /api/calendar/upcoming   – Next N upcoming events
 *
 * All endpoints are accessible to authenticated users.
 * RBAC scoping (own data vs team/all data) is applied inside CalendarService
 * based on whether the calling user is an admin.
 */
@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
@Slf4j
public class CalendarController {

    private final CalendarService calendarService;
    private final JdbcTemplate jdbcTemplate;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Resolves the authenticated user's numeric userId from the JWT username (SAM account name). */
    private Long resolveUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT user_id FROM users WHERE sam_account_name = ?",
                    Long.class, username);
        } catch (Exception e) {
            log.error("Calendar: could not resolve userId for '{}'", username);
            return null;
        }
    }

    /** Returns true if the current user has any ADMIN-level authority. */
    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.contains("ADMIN") || a.equals("TASK_VIEW_TEAM"));
    }

    // ─── Endpoints ───────────────────────────────────────────────────────────

    /**
     * Returns calendar events within the given date range.
     *
     * Query params:
     *   startDate  – ISO date (YYYY-MM-DD), required
     *   endDate    – ISO date (YYYY-MM-DD), required
     *   types      – Comma-separated list of CalendarEventType names (optional, default = all)
     *   projectId  – Filter to a specific project (optional, currently informational)
     */
    @GetMapping
    public ResponseEntity<List<CalendarEventDTO>> getEvents(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) List<String> types,
            @RequestParam(required = false) Long projectId) {

        Long userId = resolveUserId();
        if (userId == null) return ResponseEntity.status(401).build();

        try {
            LocalDate start = LocalDate.parse(startDate);
            LocalDate end   = LocalDate.parse(endDate);

            // Enforce a max window of 90 days to prevent expensive queries
            if (end.isAfter(start.plusDays(90))) end = start.plusDays(90);

            List<CalendarEventDTO> events = calendarService.getEvents(userId, start, end, types, isAdmin());

            // If projectId filter is supplied, narrow down to events referencing that project
            if (projectId != null) {
                final Long pid = projectId;
                events = events.stream()
                        .filter(e -> pid.equals(e.getReferenceId()) ||
                                ("PROJECT".equals(e.getReferenceType()) || "MILESTONE".equals(e.getReferenceType()))
                                && (e.getActionUrl() != null && e.getActionUrl().contains("/" + pid)))
                        .toList();
            }

            return ResponseEntity.ok(events);
        } catch (Exception ex) {
            log.error("Calendar getEvents error: {}", ex.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /** Returns all events for today. */
    @GetMapping("/today")
    public ResponseEntity<List<CalendarEventDTO>> getTodayEvents() {
        Long userId = resolveUserId();
        if (userId == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(calendarService.getTodayEvents(userId, isAdmin()));
        } catch (Exception ex) {
            log.error("Calendar getTodayEvents error: {}", ex.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Returns the next upcoming events (from now, looking up to 60 days ahead).
     *
     * Query params:
     *   limit – max number of events to return (default 10, max 50)
     */
    @GetMapping("/upcoming")
    public ResponseEntity<List<CalendarEventDTO>> getUpcomingEvents(
            @RequestParam(defaultValue = "10") int limit) {
        Long userId = resolveUserId();
        if (userId == null) return ResponseEntity.status(401).build();
        try {
            int safeLimit = Math.min(Math.max(1, limit), 50);
            return ResponseEntity.ok(calendarService.getUpcomingEvents(userId, safeLimit, isAdmin()));
        } catch (Exception ex) {
            log.error("Calendar getUpcomingEvents error: {}", ex.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}

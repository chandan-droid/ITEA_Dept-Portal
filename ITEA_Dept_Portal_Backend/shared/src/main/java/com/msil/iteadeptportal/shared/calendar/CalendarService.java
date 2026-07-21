package com.msil.iteadeptportal.shared.calendar;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Calendar aggregation service.
 *
 * Reads from all existing module tables via JdbcTemplate (avoiding cross-module compile-time
 * dependencies). No data is stored or mutated; this service is strictly read-only.
 *
 * All SQL queries use CAST(? AS date) / CAST(? AS timestamp) for PostgreSQL compatibility,
 * matching the pattern used throughout the existing codebase.
 *
 * Priority order used for same-day sorting (ascending):
 *   ATTENDANCE(1) → LEAVE(2) → WFH(3) → PROJECT(4) → TASK(5) → HOLIDAY(6) → ANNOUNCEMENT(7)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CalendarService {

    private final JdbcTemplate jdbc;

    // ─── Color constants ─────────────────────────────────────────────────────
    private static final String COLOR_ATTENDANCE   = "#10b981";
    private static final String COLOR_LEAVE        = "#f97316";
    private static final String COLOR_WFH          = "#3b82f6";
    private static final String COLOR_TASK         = "#8b5cf6";
    private static final String COLOR_PROJECT      = "#06b6d4";
    private static final String COLOR_HOLIDAY      = "#6b7280";
    private static final String COLOR_ANNOUNCEMENT = "#ef4444";

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Collect all events for the user within the given date range.
     *
     * @param userId    The authenticated user's ID
     * @param startDate Range start (inclusive)
     * @param endDate   Range end (inclusive)
     * @param types     Optional list of CalendarEventType names to include (null = all)
     * @param isAdmin   True if the user has admin-level access (sees all team events)
     */
    public List<CalendarEventDTO> getEvents(Long userId, LocalDate startDate, LocalDate endDate,
                                            List<String> types, boolean isAdmin) {
        List<CalendarEventDTO> events = new ArrayList<>();
        boolean includeAll = types == null || types.isEmpty();

        if (includeAll || types.contains("ATTENDANCE")) {
            events.addAll(fetchAttendanceEvents(userId, startDate, endDate, isAdmin));
        }
        if (includeAll || types.contains("LEAVE")) {
            events.addAll(fetchLeaveEvents(userId, startDate, endDate, isAdmin));
        }
        if (includeAll || types.contains("WFH")) {
            events.addAll(fetchWfhEvents(userId, startDate, endDate, isAdmin));
        }
        if (includeAll || types.contains("HOLIDAY")) {
            events.addAll(fetchHolidayEvents(startDate, endDate));
        }
        if (includeAll || types.contains("ANNOUNCEMENT")) {
            events.addAll(fetchAnnouncementEvents(startDate, endDate));
        }
        if (includeAll || types.contains("TASK")) {
            events.addAll(fetchTaskEvents(userId, startDate, endDate, isAdmin));
        }
        if (includeAll || types.contains("PROJECT")) {
            events.addAll(fetchProjectEvents(userId, startDate, endDate, isAdmin));
        }

        // Sort by startDateTime ascending, then by type priority
        events.sort(Comparator
                .comparing(CalendarEventDTO::getStartDateTime, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparingInt(e -> typePriority(e.getType())));

        return events;
    }

    /** Returns today's calendar events for the given user. */
    public List<CalendarEventDTO> getTodayEvents(Long userId, boolean isAdmin) {
        LocalDate today = LocalDate.now();
        return getEvents(userId, today, today, null, isAdmin);
    }

    /**
     * Returns the next {@code limit} upcoming events starting from now.
     * Looks 60 days ahead to bound the query.
     */
    public List<CalendarEventDTO> getUpcomingEvents(Long userId, int limit, boolean isAdmin) {
        LocalDate today = LocalDate.now();
        LocalDate end   = today.plusDays(60);
        LocalDateTime now = LocalDateTime.now();
        return getEvents(userId, today, end, null, isAdmin).stream()
                .filter(e -> e.getStartDateTime() != null && !e.getStartDateTime().isBefore(now))
                .limit(Math.max(1, limit))
                .toList();
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private int typePriority(CalendarEventType type) {
        return switch (type) {
            case ATTENDANCE   -> 1;
            case LEAVE        -> 2;
            case WFH          -> 3;
            case PROJECT      -> 4;
            case TASK         -> 5;
            case HOLIDAY      -> 6;
            case ANNOUNCEMENT -> 7;
        };
    }

    /** Converts a SQL Date/Timestamp/LocalDate object to LocalDate (null-safe). */
    private LocalDate toLocalDate(Object val) {
        if (val == null) return null;
        if (val instanceof Date d)           return d.toLocalDate();
        if (val instanceof Timestamp ts)     return ts.toLocalDateTime().toLocalDate();
        if (val instanceof LocalDate ld)     return ld;
        if (val instanceof LocalDateTime ldt) return ldt.toLocalDate();
        return null;
    }

    /** Converts a SQL Timestamp/LocalDateTime to LocalDateTime (null-safe). */
    private LocalDateTime toLocalDateTime(Object val) {
        if (val == null) return null;
        if (val instanceof Timestamp ts)      return ts.toLocalDateTime();
        if (val instanceof LocalDateTime ldt) return ldt;
        if (val instanceof Date d)            return d.toLocalDate().atStartOfDay();
        if (val instanceof LocalDate ld)      return ld.atStartOfDay();
        return null;
    }

    /** Safely get a String from a result map (null-safe). */
    private String str(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v != null ? v.toString() : "";
    }

    /** Safely get a Long from a result map (null-safe). */
    private Long lng(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v instanceof Number n ? n.longValue() : null;
    }

    // ─── ATTENDANCE (Check-In + Check-Out) ───────────────────────────────────

    private List<CalendarEventDTO> fetchAttendanceEvents(Long userId, LocalDate start, LocalDate end, boolean isAdmin) {
        List<CalendarEventDTO> events = new ArrayList<>();
        try {
            String sql;
            Object[] params;

            if (isAdmin) {
                sql = "SELECT a.attendance_id, a.user_id, u.display_name, " +
                      "a.attendance_date, a.check_in_time, a.check_out_time, a.attendance_status " +
                      "FROM attendance_records a " +
                      "JOIN users u ON a.user_id = u.user_id " +
                      "WHERE a.attendance_date >= CAST(? AS date) AND a.attendance_date <= CAST(? AS date) " +
                      "ORDER BY a.attendance_date, u.display_name";
                params = new Object[]{start.toString(), end.toString()};
            } else {
                sql = "SELECT a.attendance_id, a.user_id, u.display_name, " +
                      "a.attendance_date, a.check_in_time, a.check_out_time, a.attendance_status " +
                      "FROM attendance_records a " +
                      "JOIN users u ON a.user_id = u.user_id " +
                      "WHERE a.user_id = ? " +
                      "AND a.attendance_date >= CAST(? AS date) AND a.attendance_date <= CAST(? AS date) " +
                      "ORDER BY a.attendance_date";
                params = new Object[]{userId, start.toString(), end.toString()};
            }

            List<Map<String, Object>> rows = jdbc.queryForList(sql, params);
            for (Map<String, Object> row : rows) {
                Long id   = lng(row, "attendance_id");
                if (id == null) continue;
                String name = isAdmin ? (" — " + str(row, "display_name")) : "";
                LocalDate date = toLocalDate(row.get("attendance_date"));
                if (date == null) continue;

                LocalDateTime checkIn  = toLocalDateTime(row.get("check_in_time"));
                LocalDateTime checkOut = toLocalDateTime(row.get("check_out_time"));

                // Check-In event
                if (checkIn != null) {
                    String timeStr = String.format("%02d:%02d", checkIn.getHour(), checkIn.getMinute());
                    events.add(CalendarEventDTO.builder()
                            .id(id)
                            .title("✅ Checked In" + name)
                            .description("Check-in at " + timeStr)
                            .type(CalendarEventType.ATTENDANCE)
                            .startDateTime(checkIn)
                            .endDateTime(checkIn)
                            .allDay(false)
                            .color(COLOR_ATTENDANCE)
                            .icon("login")
                            .referenceType("ATTENDANCE")
                            .referenceId(id)
                            .actionUrl("/attendance")
                            .build());
                }

                // Check-Out event
                if (checkOut != null) {
                    String timeStr = String.format("%02d:%02d", checkOut.getHour(), checkOut.getMinute());
                    events.add(CalendarEventDTO.builder()
                            .id(id * 100_000L + 1)
                            .title("🚪 Checked Out" + name)
                            .description("Check-out at " + timeStr)
                            .type(CalendarEventType.ATTENDANCE)
                            .startDateTime(checkOut)
                            .endDateTime(checkOut)
                            .allDay(false)
                            .color(COLOR_ATTENDANCE)
                            .icon("logout")
                            .referenceType("ATTENDANCE")
                            .referenceId(id)
                            .actionUrl("/attendance")
                            .build());
                }
            }
            log.debug("Calendar: fetched {} attendance events for userId={}", events.size(), userId);
        } catch (Exception e) {
            log.error("Calendar: failed to fetch attendance events", e);
        }
        return events;
    }

    // ─── LEAVE (Approved only) ───────────────────────────────────────────────

    private List<CalendarEventDTO> fetchLeaveEvents(Long userId, LocalDate start, LocalDate end, boolean isAdmin) {
        List<CalendarEventDTO> events = new ArrayList<>();
        try {
            String sql;
            Object[] params;

            if (isAdmin) {
                sql = "SELECT lr.leave_request_id, lr.user_id, u.display_name, " +
                      "lr.start_date, lr.end_date, lr.reason, lr.status " +
                      "FROM leave_requests lr " +
                      "JOIN users u ON lr.user_id = u.user_id " +
                      "WHERE lr.status = 'APPROVED' " +
                      "AND lr.start_date <= CAST(? AS date) AND lr.end_date >= CAST(? AS date)";
                params = new Object[]{end.toString(), start.toString()};
            } else {
                sql = "SELECT lr.leave_request_id, lr.user_id, u.display_name, " +
                      "lr.start_date, lr.end_date, lr.reason, lr.status " +
                      "FROM leave_requests lr " +
                      "JOIN users u ON lr.user_id = u.user_id " +
                      "WHERE lr.user_id = ? AND lr.status = 'APPROVED' " +
                      "AND lr.start_date <= CAST(? AS date) AND lr.end_date >= CAST(? AS date)";
                params = new Object[]{userId, end.toString(), start.toString()};
            }

            List<Map<String, Object>> rows = jdbc.queryForList(sql, params);
            for (Map<String, Object> row : rows) {
                Long id    = lng(row, "leave_request_id");
                if (id == null) continue;
                String name = isAdmin ? (" — " + str(row, "display_name")) : "";
                LocalDate s  = toLocalDate(row.get("start_date"));
                LocalDate en = toLocalDate(row.get("end_date"));
                if (s == null) continue;
                String reason = str(row, "reason");

                events.add(CalendarEventDTO.builder()
                        .id(id)
                        .title("🏖️ Leave" + name)
                        .description(reason.isBlank() ? "Approved leave" : reason)
                        .type(CalendarEventType.LEAVE)
                        .startDateTime(s.atStartOfDay())
                        .endDateTime(en != null ? en.atTime(23, 59, 59) : s.atTime(23, 59, 59))
                        .allDay(true)
                        .color(COLOR_LEAVE)
                        .icon("beach_access")
                        .referenceType("LEAVE")
                        .referenceId(id)
                        .actionUrl("/attendance")
                        .build());
            }
            log.debug("Calendar: fetched {} leave events for userId={}", events.size(), userId);
        } catch (Exception e) {
            log.error("Calendar: failed to fetch leave events", e);
        }
        return events;
    }

    // ─── WFH (Approved only) ─────────────────────────────────────────────────

    private List<CalendarEventDTO> fetchWfhEvents(Long userId, LocalDate start, LocalDate end, boolean isAdmin) {
        List<CalendarEventDTO> events = new ArrayList<>();
        try {
            String sql;
            Object[] params;

            if (isAdmin) {
                sql = "SELECT wr.wfh_request_id, wr.user_id, u.display_name, wr.wfh_date, wr.reason " +
                      "FROM wfh_requests wr " +
                      "JOIN users u ON wr.user_id = u.user_id " +
                      "WHERE wr.status = 'APPROVED' " +
                      "AND wr.wfh_date >= CAST(? AS date) AND wr.wfh_date <= CAST(? AS date)";
                params = new Object[]{start.toString(), end.toString()};
            } else {
                sql = "SELECT wr.wfh_request_id, wr.user_id, u.display_name, wr.wfh_date, wr.reason " +
                      "FROM wfh_requests wr " +
                      "JOIN users u ON wr.user_id = u.user_id " +
                      "WHERE wr.user_id = ? AND wr.status = 'APPROVED' " +
                      "AND wr.wfh_date >= CAST(? AS date) AND wr.wfh_date <= CAST(? AS date)";
                params = new Object[]{userId, start.toString(), end.toString()};
            }

            List<Map<String, Object>> rows = jdbc.queryForList(sql, params);
            for (Map<String, Object> row : rows) {
                Long id = lng(row, "wfh_request_id");
                if (id == null) continue;
                String name = isAdmin ? (" — " + str(row, "display_name")) : "";
                LocalDate date = toLocalDate(row.get("wfh_date"));
                if (date == null) continue;
                String reason = str(row, "reason");

                events.add(CalendarEventDTO.builder()
                        .id(id)
                        .title("🏠 WFH" + name)
                        .description(reason.isBlank() ? "Approved WFH day" : reason)
                        .type(CalendarEventType.WFH)
                        .startDateTime(date.atStartOfDay())
                        .endDateTime(date.atTime(23, 59, 59))
                        .allDay(true)
                        .color(COLOR_WFH)
                        .icon("home")
                        .referenceType("WFH")
                        .referenceId(id)
                        .actionUrl("/attendance")
                        .build());
            }
            log.debug("Calendar: fetched {} WFH events for userId={}", events.size(), userId);
        } catch (Exception e) {
            log.error("Calendar: failed to fetch WFH events", e);
        }
        return events;
    }

    // ─── HOLIDAYS (visible to everyone) ──────────────────────────────────────

    private List<CalendarEventDTO> fetchHolidayEvents(LocalDate start, LocalDate end) {
        List<CalendarEventDTO> events = new ArrayList<>();
        try {
            String sql = "SELECT holiday_id, holiday_date, holiday_name, holiday_type, description, is_optional " +
                         "FROM holidays " +
                         "WHERE holiday_date >= CAST(? AS date) AND holiday_date <= CAST(? AS date) " +
                         "ORDER BY holiday_date";
            List<Map<String, Object>> rows = jdbc.queryForList(sql, start.toString(), end.toString());
            for (Map<String, Object> row : rows) {
                Long id    = lng(row, "holiday_id");
                if (id == null) continue;
                LocalDate date = toLocalDate(row.get("holiday_date"));
                if (date == null) continue;
                String name = str(row, "holiday_name");
                String desc = str(row, "description");
                String type = str(row, "holiday_type");
                Boolean optional = row.get("is_optional") instanceof Boolean b ? b : false;

                events.add(CalendarEventDTO.builder()
                        .id(id)
                        .title("🎉 " + name + (optional ? " (Optional)" : ""))
                        .description((type.isBlank() ? "" : type + " — ") + (desc.isBlank() ? "Holiday" : desc))
                        .type(CalendarEventType.HOLIDAY)
                        .startDateTime(date.atStartOfDay())
                        .endDateTime(date.atTime(23, 59, 59))
                        .allDay(true)
                        .color(COLOR_HOLIDAY)
                        .icon("celebration")
                        .referenceType("HOLIDAY")
                        .referenceId(id)
                        .actionUrl("/attendance")
                        .build());
            }
            log.debug("Calendar: fetched {} holiday events", events.size());
        } catch (Exception e) {
            log.error("Calendar: failed to fetch holiday events", e);
        }
        return events;
    }

    // ─── ANNOUNCEMENTS (Published, within date range) ────────────────────────

    private List<CalendarEventDTO> fetchAnnouncementEvents(LocalDate start, LocalDate end) {
        List<CalendarEventDTO> events = new ArrayList<>();
        try {
            String sql = "SELECT announcement_id, title, message, priority, publish_from, publish_until, published_at " +
                         "FROM announcements " +
                         "WHERE status = 'PUBLISHED' " +
                         "AND (publish_from IS NULL OR publish_from <= CAST(? AS timestamp)) " +
                         "AND (publish_until IS NULL OR publish_until >= CAST(? AS timestamp)) " +
                         "ORDER BY publish_from";
            Object[] params = new Object[]{
                end.atTime(23, 59, 59).toString(),
                start.atStartOfDay().toString()
            };

            List<Map<String, Object>> rows = jdbc.queryForList(sql, params);
            for (Map<String, Object> row : rows) {
                Long id    = lng(row, "announcement_id");
                if (id == null) continue;
                String title = str(row, "title");
                String msg   = str(row, "message");
                String priority = str(row, "priority");

                LocalDateTime publishFrom  = toLocalDateTime(row.get("publish_from"));
                LocalDateTime publishUntil = toLocalDateTime(row.get("publish_until"));
                LocalDateTime publishedAt  = toLocalDateTime(row.get("published_at"));

                LocalDateTime evtStart = publishFrom != null ? publishFrom : (publishedAt != null ? publishedAt : start.atStartOfDay());
                LocalDateTime evtEnd   = publishUntil;

                String priorityEmoji = "HIGH".equals(priority) ? "🔴 " : "MEDIUM".equals(priority) ? "🟡 " : "";

                events.add(CalendarEventDTO.builder()
                        .id(id)
                        .title(priorityEmoji + "📢 " + title)
                        .description(msg.length() > 200 ? msg.substring(0, 200) + "…" : msg)
                        .type(CalendarEventType.ANNOUNCEMENT)
                        .startDateTime(evtStart)
                        .endDateTime(evtEnd)
                        .allDay(true)
                        .color(COLOR_ANNOUNCEMENT)
                        .icon("campaign")
                        .referenceType("ANNOUNCEMENT")
                        .referenceId(id)
                        .actionUrl("/announcements")
                        .build());
            }
            log.debug("Calendar: fetched {} announcement events", events.size());
        } catch (Exception e) {
            log.error("Calendar: failed to fetch announcement events", e);
        }
        return events;
    }

    // ─── TASKS (Start dates + Due dates + Overdue) ───────────────────────────

    private List<CalendarEventDTO> fetchTaskEvents(Long userId, LocalDate start, LocalDate end, boolean isAdmin) {
        List<CalendarEventDTO> events = new ArrayList<>();
        try {
            String sql;
            Object[] params;

            if (isAdmin) {
                sql = "SELECT t.task_id, t.task_code, t.title, t.status, t.priority, " +
                      "t.start_date, t.due_date, t.project_id, t.progress_percentage " +
                      "FROM tasks t " +
                      "WHERE t.archived = false " +
                      "AND t.status NOT IN ('CANCELLED', 'ARCHIVED') " +
                      "AND ( " +
                      "  (t.start_date IS NOT NULL AND t.start_date >= CAST(? AS date) AND t.start_date <= CAST(? AS date)) OR " +
                      "  (t.due_date IS NOT NULL AND t.due_date >= CAST(? AS date) AND t.due_date <= CAST(? AS date)) OR " +
                      "  (t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND t.status NOT IN ('COMPLETED','APPROVED')) " +
                      ")";
                params = new Object[]{start.toString(), end.toString(), start.toString(), end.toString()};
            } else {
                sql = "SELECT t.task_id, t.task_code, t.title, t.status, t.priority, " +
                      "t.start_date, t.due_date, t.project_id, t.progress_percentage " +
                      "FROM tasks t " +
                      "INNER JOIN task_assignees ta ON t.task_id = ta.task_id " +
                      "WHERE ta.user_id = ? " +
                      "AND t.archived = false " +
                      "AND t.status NOT IN ('CANCELLED', 'ARCHIVED') " +
                      "AND ( " +
                      "  (t.start_date IS NOT NULL AND t.start_date >= CAST(? AS date) AND t.start_date <= CAST(? AS date)) OR " +
                      "  (t.due_date IS NOT NULL AND t.due_date >= CAST(? AS date) AND t.due_date <= CAST(? AS date)) OR " +
                      "  (t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND t.status NOT IN ('COMPLETED','APPROVED')) " +
                      ")";
                params = new Object[]{userId, start.toString(), end.toString(), start.toString(), end.toString()};
            }

            List<Map<String, Object>> rows = jdbc.queryForList(sql, params);
            for (Map<String, Object> row : rows) {
                Long id      = lng(row, "task_id");
                if (id == null) continue;
                String code     = str(row, "task_code");
                String title    = str(row, "title");
                String status   = str(row, "status");
                String priority = str(row, "priority");
                LocalDate taskStart = toLocalDate(row.get("start_date"));
                LocalDate taskDue   = toLocalDate(row.get("due_date"));
                Integer progress = row.get("progress_percentage") instanceof Number n ? n.intValue() : 0;

                boolean isOverdue = taskDue != null && taskDue.isBefore(LocalDate.now())
                        && !List.of("COMPLETED", "APPROVED").contains(status);

                String priorityEmoji = switch (priority) {
                    case "CRITICAL" -> "🔴 ";
                    case "HIGH"     -> "🟠 ";
                    case "MEDIUM"   -> "🟡 ";
                    default         -> "";
                };

                // Task Start event
                if (taskStart != null && !taskStart.isBefore(start) && !taskStart.isAfter(end)) {
                    events.add(CalendarEventDTO.builder()
                            .id(id)
                            .title(priorityEmoji + code + " — Start")
                            .description(title + " [" + status + "] " + progress + "% done")
                            .type(CalendarEventType.TASK)
                            .startDateTime(taskStart.atTime(9, 0))
                            .endDateTime(taskStart.atTime(9, 0))
                            .allDay(false)
                            .color(COLOR_TASK)
                            .icon("play_circle")
                            .referenceType("TASK")
                            .referenceId(id)
                            .actionUrl("/tasks")
                            .build());
                }

                // Task Due / Overdue event
                if (taskDue != null) {
                    boolean inRange = !taskDue.isBefore(start) && !taskDue.isAfter(end);
                    if (inRange || isOverdue) {
                        String dueTitle = isOverdue
                                ? "⚠️ " + priorityEmoji + code + " — OVERDUE"
                                : priorityEmoji + code + " — Due";
                        events.add(CalendarEventDTO.builder()
                                .id(id * 100_000L + 2)
                                .title(dueTitle)
                                .description(title + " [" + status + "] " + progress + "% done" + (isOverdue ? " — OVERDUE!" : ""))
                                .type(CalendarEventType.TASK)
                                .startDateTime(taskDue.atTime(17, 0))
                                .endDateTime(taskDue.atTime(17, 0))
                                .allDay(false)
                                .color(isOverdue ? "#ef4444" : COLOR_TASK)
                                .icon(isOverdue ? "warning" : "flag")
                                .referenceType("TASK")
                                .referenceId(id)
                                .actionUrl("/tasks")
                                .build());
                    }
                }
            }
            log.debug("Calendar: fetched {} task events for userId={}", events.size(), userId);
        } catch (Exception e) {
            log.error("Calendar: failed to fetch task events", e);
        }
        return events;
    }

    // ─── PROJECTS (Kickoff + Deadline + Milestones) ──────────────────────────

    private List<CalendarEventDTO> fetchProjectEvents(Long userId, LocalDate start, LocalDate end, boolean isAdmin) {
        List<CalendarEventDTO> events = new ArrayList<>();
        try {
            // ── Project Start / End dates ────────────────────────────────
            String projSql;
            Object[] projParams;

            if (isAdmin) {
                projSql = "SELECT project_id, project_code, project_name, status, " +
                          "planned_start_date, planned_end_date, actual_start_date, actual_end_date, progress_percentage " +
                          "FROM projects " +
                          "WHERE archived = false AND status NOT IN ('CANCELLED','ARCHIVED') " +
                          "AND ((planned_start_date IS NOT NULL AND planned_start_date >= CAST(? AS date) AND planned_start_date <= CAST(? AS date)) " +
                          "  OR (planned_end_date IS NOT NULL AND planned_end_date >= CAST(? AS date) AND planned_end_date <= CAST(? AS date)))";
                projParams = new Object[]{start.toString(), end.toString(), start.toString(), end.toString()};
            } else {
                projSql = "SELECT p.project_id, p.project_code, p.project_name, p.status, " +
                          "p.planned_start_date, p.planned_end_date, p.actual_start_date, p.actual_end_date, p.progress_percentage " +
                          "FROM projects p " +
                          "INNER JOIN project_members pm ON p.project_id = pm.project_id " +
                          "WHERE pm.user_id = ? AND pm.left_at IS NULL " +
                          "AND p.archived = false AND p.status NOT IN ('CANCELLED','ARCHIVED') " +
                          "AND ((p.planned_start_date IS NOT NULL AND p.planned_start_date >= CAST(? AS date) AND p.planned_start_date <= CAST(? AS date)) " +
                          "  OR (p.planned_end_date IS NOT NULL AND p.planned_end_date >= CAST(? AS date) AND p.planned_end_date <= CAST(? AS date)))";
                projParams = new Object[]{userId, start.toString(), end.toString(), start.toString(), end.toString()};
            }

            List<Map<String, Object>> projRows = jdbc.queryForList(projSql, projParams);
            for (Map<String, Object> row : projRows) {
                Long id      = lng(row, "project_id");
                if (id == null) continue;
                String code  = str(row, "project_code");
                String name  = str(row, "project_name");
                String status = str(row, "status");
                Integer progress = row.get("progress_percentage") instanceof Number n ? n.intValue() : 0;
                LocalDate ps = toLocalDate(row.get("planned_start_date"));
                LocalDate pe = toLocalDate(row.get("planned_end_date"));

                // Project Kickoff
                if (ps != null && !ps.isBefore(start) && !ps.isAfter(end)) {
                    events.add(CalendarEventDTO.builder()
                            .id(id)
                            .title("🚀 [" + code + "] Kickoff")
                            .description(name + " — " + status + " (" + progress + "%)")
                            .type(CalendarEventType.PROJECT)
                            .startDateTime(ps.atTime(9, 0))
                            .endDateTime(ps.atTime(9, 0))
                            .allDay(false)
                            .color(COLOR_PROJECT)
                            .icon("rocket_launch")
                            .referenceType("PROJECT")
                            .referenceId(id)
                            .actionUrl("/projects/" + id)
                            .build());
                }

                // Project Deadline
                if (pe != null && !pe.isBefore(start) && !pe.isAfter(end)) {
                    boolean overdue = pe.isBefore(LocalDate.now()) && !List.of("COMPLETED", "CANCELLED", "ARCHIVED").contains(status);
                    events.add(CalendarEventDTO.builder()
                            .id(id * 100_000L + 3)
                            .title((overdue ? "⚠️ " : "🏁 ") + "[" + code + "] Deadline")
                            .description(name + " — " + status + " (" + progress + "%)" + (overdue ? " — OVERDUE!" : ""))
                            .type(CalendarEventType.PROJECT)
                            .startDateTime(pe.atTime(18, 0))
                            .endDateTime(pe.atTime(18, 0))
                            .allDay(false)
                            .color(overdue ? "#ef4444" : COLOR_PROJECT)
                            .icon("flag")
                            .referenceType("PROJECT")
                            .referenceId(id)
                            .actionUrl("/projects/" + id)
                            .build());
                }
            }

            // ── Project Milestones ───────────────────────────────────────
            String milestoneSql;
            Object[] msParams;

            if (isAdmin) {
                milestoneSql = "SELECT ms.milestone_id, ms.project_id, ms.milestone_name, ms.status, ms.target_date, " +
                               "ms.completed_date, p.project_name, p.project_code " +
                               "FROM project_milestones ms " +
                               "INNER JOIN projects p ON ms.project_id = p.project_id " +
                               "WHERE ms.target_date >= CAST(? AS date) AND ms.target_date <= CAST(? AS date) " +
                               "AND ms.status NOT IN ('CANCELLED') " +
                               "ORDER BY ms.target_date";
                msParams = new Object[]{start.toString(), end.toString()};
            } else {
                milestoneSql = "SELECT ms.milestone_id, ms.project_id, ms.milestone_name, ms.status, ms.target_date, " +
                               "ms.completed_date, p.project_name, p.project_code " +
                               "FROM project_milestones ms " +
                               "INNER JOIN projects p ON ms.project_id = p.project_id " +
                               "INNER JOIN project_members pm ON p.project_id = pm.project_id " +
                               "WHERE pm.user_id = ? AND pm.left_at IS NULL " +
                               "AND ms.target_date >= CAST(? AS date) AND ms.target_date <= CAST(? AS date) " +
                               "AND ms.status NOT IN ('CANCELLED') " +
                               "ORDER BY ms.target_date";
                msParams = new Object[]{userId, start.toString(), end.toString()};
            }

            List<Map<String, Object>> msRows = jdbc.queryForList(milestoneSql, msParams);
            for (Map<String, Object> row : msRows) {
                Long id      = lng(row, "milestone_id");
                if (id == null) continue;
                Long projId  = lng(row, "project_id");
                String msName   = str(row, "milestone_name");
                String projName = str(row, "project_name");
                String projCode = str(row, "project_code");
                String msStatus = str(row, "status");
                LocalDate target = toLocalDate(row.get("target_date"));
                if (target == null) continue;
                boolean completed = "COMPLETED".equals(msStatus);

                events.add(CalendarEventDTO.builder()
                        .id(id * 100_000L + 4)
                        .title((completed ? "✅ " : "◆ ") + msName)
                        .description("[" + projCode + "] " + projName + " — Milestone " + msStatus)
                        .type(CalendarEventType.PROJECT)
                        .startDateTime(target.atTime(10, 0))
                        .endDateTime(target.atTime(10, 0))
                        .allDay(false)
                        .color(completed ? "#6b7280" : COLOR_PROJECT)
                        .icon("milestone")
                        .referenceType("MILESTONE")
                        .referenceId(projId)
                        .actionUrl("/projects/" + projId)
                        .build());
            }
            log.debug("Calendar: fetched {} project/milestone events for userId={}", events.size(), userId);
        } catch (Exception e) {
            log.error("Calendar: failed to fetch project events", e);
        }
        return events;
    }
}

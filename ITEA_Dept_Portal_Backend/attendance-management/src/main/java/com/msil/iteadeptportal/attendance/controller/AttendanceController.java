package com.msil.iteadeptportal.attendance.controller;

import com.msil.iteadeptportal.attendance.api.*;
import com.msil.iteadeptportal.attendance.service.AttendanceService;
import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.shared.api.ApiResponse;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final UserFacade userFacade;

    // ─── POST /api/attendance/check-in ────────────────────────────────────────

    @PostMapping("/check-in")
    @PreAuthorize("hasAuthority('ATTENDANCE_CHECK_IN')")
    public ResponseEntity<ApiResponse<CheckInResponse>> checkIn(
            @RequestBody(required = false) CheckInRequest request,
            HttpServletRequest httpRequest) {

        Long userId = resolveUserId();
        String ip   = extractClientIp(httpRequest);
        Double lat  = request != null ? request.getLatitude()  : null;
        Double lon  = request != null ? request.getLongitude() : null;

        CheckInResponse response = attendanceService.checkIn(userId, ip, lat, lon);
        return ResponseEntity.ok(ApiResponse.success(response, response.getMessage()));
    }

    // ─── POST /api/attendance/check-out ───────────────────────────────────────

    @PostMapping("/check-out")
    @PreAuthorize("hasAuthority('ATTENDANCE_CHECK_OUT')")
    public ResponseEntity<ApiResponse<CheckOutResponse>> checkOut() {
        Long userId = resolveUserId();
        CheckOutResponse response = attendanceService.checkOut(userId);
        return ResponseEntity.ok(ApiResponse.success(response, response.getMessage()));
    }

    // ─── GET /api/attendance/today ────────────────────────────────────────────

    @GetMapping("/today")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW_SELF')")
    public ResponseEntity<ApiResponse<TodayAttendanceDTO>> getToday() {
        Long userId = resolveUserId();
        TodayAttendanceDTO dto = attendanceService.getToday(userId);
        return ResponseEntity.ok(ApiResponse.success(dto, "Today's attendance retrieved."));
    }

    // ─── GET /api/attendance/calendar ─────────────────────────────────────────

    @GetMapping("/calendar")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW_SELF')")
    public ResponseEntity<ApiResponse<java.util.List<CalendarDayDTO>>> getCalendar(
            @RequestParam(defaultValue = "0") int month,
            @RequestParam(defaultValue = "0") int year) {

        if (month == 0) month = LocalDate.now().getMonthValue();
        if (year  == 0) year  = LocalDate.now().getYear();

        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.getCalendar(userId, month, year),
                "Calendar retrieved."));
    }

    // ─── GET /api/attendance/history ──────────────────────────────────────────

    @GetMapping("/history")
    @PreAuthorize("hasAuthority('ATTENDANCE_HISTORY_VIEW')")
    public ResponseEntity<ApiResponse<PaginatedResponse<AttendanceHistoryDTO>>> getHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "attendanceDate,desc") String sort) {

        Long userId = resolveUserId();
        PaginatedResponse<AttendanceHistoryDTO> result =
                attendanceService.getHistory(userId, fromDate, toDate, status, page, size, sort);
        return ResponseEntity.ok(ApiResponse.success(result, "Attendance history retrieved."));
    }

    // ─── GET /api/attendance/search ───────────────────────────────────────────

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<PaginatedResponse<AttendanceSearchResultDTO>>> searchAttendance(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "attendanceDate,desc") String sort) {

        PaginatedResponse<AttendanceSearchResultDTO> result =
                attendanceService.searchAttendance(search, status, fromDate, toDate, page, size, sort);
        return ResponseEntity.ok(ApiResponse.success(result, "Search results retrieved."));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Long resolveUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userFacade.getUserBySamAccountName(username)
                .map(UserDTO::getUserId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + username));
    }

    private String extractClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty()) return ip.split(",")[0].trim();
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isEmpty()) return ip;
        return request.getRemoteAddr();
    }
}

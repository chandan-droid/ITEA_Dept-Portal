package com.msil.iteadeptportal.attendance.controller;

import com.msil.iteadeptportal.attendance.api.*;
import com.msil.iteadeptportal.attendance.service.AttendanceService;
import com.msil.iteadeptportal.shared.api.ApiResponse;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/team")
@RequiredArgsConstructor
public class TeamController {

    private final AttendanceService attendanceService;

    // ─── GET /api/team/attendance ─────────────────────────────────────────────

    @GetMapping("/attendance")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<TeamAttendanceDayDTO>> getTeamAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        TeamAttendanceDayDTO result = attendanceService.getTeamAttendance(targetDate);
        return ResponseEntity.ok(ApiResponse.success(result, "Team attendance retrieved."));
    }

    // ─── GET /api/team/attendance/{employeeId} ────────────────────────────────

    @GetMapping("/attendance/{employeeId}")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<PaginatedResponse<AttendanceSearchResultDTO>>> getEmployeeAttendance(
            @PathVariable String employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PaginatedResponse<AttendanceSearchResultDTO> result =
                attendanceService.getEmployeeAttendance(employeeId, fromDate, toDate, page, size);
        return ResponseEntity.ok(ApiResponse.success(result, "Employee attendance retrieved."));
    }

    // ─── GET /api/team/attendance/summary ─────────────────────────────────────

    @GetMapping("/attendance/summary")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<TeamAttendanceSummaryDTO>> getTeamAttendanceSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        TeamAttendanceSummaryDTO summary = attendanceService.getTeamAttendanceSummary(targetDate);
        return ResponseEntity.ok(ApiResponse.success(summary, "Team attendance summary retrieved."));
    }
}

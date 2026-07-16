package com.msil.iteadeptportal.attendance.controller;

import com.msil.iteadeptportal.attendance.api.*;
import com.msil.iteadeptportal.attendance.service.AttendanceService;
import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.shared.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final AttendanceService attendanceService;
    private final UserFacade userFacade;

    // ─── GET /api/reports/attendance ──────────────────────────────────────────

    @GetMapping("/attendance")
    @PreAuthorize("hasAuthority('ATTENDANCE_REPORT_VIEW')")
    public ResponseEntity<ApiResponse<AttendanceReportDTO>> getAttendanceReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserDTO userDTO = userFacade.getUserBySamAccountName(username)
                .orElseThrow(() -> new IllegalStateException("User not found: " + username));

        AttendanceReportDTO report = attendanceService.getReport(
                userDTO.getUserId(), userDTO.getEmployeeId(), userDTO.getDisplayName(),
                fromDate, toDate);
        return ResponseEntity.ok(ApiResponse.success(report, "Attendance report generated."));
    }

    // ─── GET /api/reports/team-attendance ─────────────────────────────────────

    @GetMapping("/team-attendance")
    @PreAuthorize("hasAuthority('ATTENDANCE_REPORT_VIEW')")
    public ResponseEntity<ApiResponse<List<TeamReportEntryDTO>>> getTeamAttendanceReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        List<TeamReportEntryDTO> report = attendanceService.getTeamReport(fromDate, toDate);
        return ResponseEntity.ok(ApiResponse.success(report, "Team attendance report generated."));
    }
}

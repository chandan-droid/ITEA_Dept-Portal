package com.msil.iteadeptportal.attendance.controller;

import com.msil.iteadeptportal.attendance.api.*;
import com.msil.iteadeptportal.attendance.service.AttendanceService;
import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.shared.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        LocalDate from = fromDate != null ? fromDate : LocalDate.now().minusDays(30);
        LocalDate to = toDate != null ? toDate : LocalDate.now();

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        UserDTO userDTO = userFacade.getUserBySamAccountName(username)
                .orElseThrow(() -> new IllegalStateException("User not found: " + username));

        AttendanceReportDTO report = attendanceService.getReport(
                userDTO.getUserId(), userDTO.getEmployeeId(), userDTO.getDisplayName(),
                from, to);
        return ResponseEntity.ok(ApiResponse.success(report, "Attendance report generated."));
    }

    // ─── GET /api/reports/team-attendance ─────────────────────────────────────

    @GetMapping("/team-attendance")
    @PreAuthorize("hasAuthority('ATTENDANCE_REPORT_VIEW')")
    public ResponseEntity<ApiResponse<List<TeamReportEntryDTO>>> getTeamAttendanceReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        LocalDate from = fromDate != null ? fromDate : LocalDate.now().minusDays(30);
        LocalDate to = toDate != null ? toDate : LocalDate.now();

        List<TeamReportEntryDTO> report = attendanceService.getTeamReport(from, to);
        return ResponseEntity.ok(ApiResponse.success(report, "Team attendance report generated."));
    }

    // ─── GET /api/reports/attendance/export ───────────────────────────────────

    @GetMapping("/attendance/export")
    @PreAuthorize("hasAuthority('ATTENDANCE_EXPORT')")
    public ResponseEntity<byte[]> exportAttendanceReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "csv") String format) {

        byte[] fileData = attendanceService.exportAttendanceReport(fromDate, toDate, format);
        String filename = "attendance_report_" + LocalDate.now() + "." + format.toLowerCase();

        MediaType mediaType = "pdf".equalsIgnoreCase(format) ? MediaType.APPLICATION_PDF
                : "excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format) ? MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                : MediaType.parseMediaType("text/csv");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(mediaType)
                .body(fileData);
    }
}

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

@RestController
@RequestMapping("/api/team")
@RequiredArgsConstructor
public class TeamController {

    private final AttendanceService attendanceService;
    private final UserFacade userFacade;

    // ─── GET /api/team/attendance ─────────────────────────────────────────────

    @GetMapping("/attendance")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<TeamAttendanceDayDTO>> getTeamAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        TeamAttendanceDayDTO result = attendanceService.getTeamAttendance(targetDate);
        return ResponseEntity.ok(ApiResponse.success(result, "Team attendance retrieved."));
    }
}

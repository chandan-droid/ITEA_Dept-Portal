package com.msil.iteadeptportal.attendance.controller;

import com.msil.iteadeptportal.attendance.api.HolidayDTO;
import com.msil.iteadeptportal.attendance.service.HolidayService;
import com.msil.iteadeptportal.shared.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService holidayService;

    @GetMapping
    @PreAuthorize("hasAuthority('HOLIDAY_VIEW') or hasAuthority('ATTENDANCE_VIEW_SELF')")
    public ResponseEntity<ApiResponse<List<HolidayDTO>>> getHolidays(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.getHolidays(fromDate, toDate), "Holidays retrieved."));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('HOLIDAY_MANAGE')")
    public ResponseEntity<ApiResponse<HolidayDTO>> createHoliday(@RequestBody HolidayDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.createHoliday(dto), "Holiday created successfully."));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('HOLIDAY_MANAGE')")
    public ResponseEntity<ApiResponse<HolidayDTO>> updateHoliday(@PathVariable Long id, @RequestBody HolidayDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(holidayService.updateHoliday(id, dto), "Holiday updated successfully."));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('HOLIDAY_MANAGE')")
    public ResponseEntity<ApiResponse<Void>> deleteHoliday(@PathVariable Long id) {
        holidayService.deleteHoliday(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Holiday deleted successfully."));
    }
}

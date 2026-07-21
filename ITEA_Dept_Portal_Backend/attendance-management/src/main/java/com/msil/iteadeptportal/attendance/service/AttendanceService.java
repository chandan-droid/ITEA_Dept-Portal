package com.msil.iteadeptportal.attendance.service;

import com.msil.iteadeptportal.attendance.api.*;
import com.msil.iteadeptportal.attendance.model.AttendanceRecord;
import com.msil.iteadeptportal.attendance.model.Holiday;
import com.msil.iteadeptportal.attendance.repository.*;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final HolidayRepository holidayRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final WfhRequestRepository wfhRequestRepository;

    // ─── Check-In ─────────────────────────────────────────────────────────────

    public CheckInResponse checkIn(Long userId, String clientIp, Double latitude, Double longitude) {
        LocalDate today = LocalDate.now();

        if (attendanceRepository.findByUserIdAndAttendanceDate(userId, today).isPresent()) {
            throw new IllegalStateException("Already checked in for today.");
        }

        String location = (latitude != null && longitude != null)
                ? latitude + "," + longitude
                : null;

        AttendanceRecord record = AttendanceRecord.builder()
                .userId(userId)
                .attendanceDate(today)
                .checkInTime(LocalDateTime.now())
                .checkInIp(clientIp)
                .checkInLocation(location)
                .workingMinutes(0)
                .attendanceStatus("PRESENT")
                .build();

        record = attendanceRepository.save(record);

        return CheckInResponse.builder()
                .message("Check-in successful.")
                .attendanceId(record.getAttendanceId())
                .checkInTime(record.getCheckInTime())
                .build();
    }

    // ─── Check-Out ────────────────────────────────────────────────────────────

    public CheckOutResponse checkOut(Long userId, String clientIp, Double latitude, Double longitude) {
        LocalDate today = LocalDate.now();

        AttendanceRecord record = attendanceRepository
                .findByUserIdAndAttendanceDate(userId, today)
                .orElseThrow(() -> new IllegalStateException("No check-in found for today."));

        if (record.getCheckOutTime() != null) {
            throw new IllegalStateException("Already checked out for today.");
        }

        LocalDateTime now = LocalDateTime.now();
        long minutes = ChronoUnit.MINUTES.between(record.getCheckInTime(), now);
        String status = minutes >= 480 ? "PRESENT" : "HALF_DAY";

        // Build location string from GPS coords if provided
        String location = (latitude != null && longitude != null)
                ? latitude + "," + longitude
                : null;

        record.setCheckOutTime(now);
        record.setWorkingMinutes((int) minutes);
        record.setAttendanceStatus(status);
        record.setCheckOutIp(clientIp);
        record.setCheckOutLocation(location);
        attendanceRepository.save(record);

        return CheckOutResponse.builder()
                .message("Check-out successful.")
                .workingMinutes((int) minutes)
                .attendanceStatus(status)
                .checkOutIp(clientIp)
                .checkOutLocation(location)
                .build();
    }

    // ─── Today ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public TodayAttendanceDTO getToday(Long userId) {
        LocalDate today = LocalDate.now();
        return attendanceRepository.findByUserIdAndAttendanceDate(userId, today)
                .map(this::toTodayDTO)
                .orElse(TodayAttendanceDTO.builder()
                        .attendanceDate(today)
                        .checkInTime(null)
                        .checkOutTime(null)
                        .workingMinutes(0)
                        .status("NOT_CHECKED_IN")
                        .build());
    }

    // ─── Calendar ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CalendarDayDTO> getCalendar(Long userId, int month, int year) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to   = from.withDayOfMonth(from.lengthOfMonth());

        // Attendance records keyed by date
        Map<LocalDate, String> recordMap = new HashMap<>();
        attendanceRepository
                .findByUserIdAndAttendanceDateBetween(userId, from, to)
                .forEach(r -> recordMap.put(r.getAttendanceDate(), r.getAttendanceStatus()));

        // Leave requests (Approved & Pending)
        List<com.msil.iteadeptportal.attendance.model.LeaveRequest> leaves = leaveRequestRepository.findByUserId(userId);
        if (leaves != null) {
            for (var l : leaves) {
                if ("APPROVED".equalsIgnoreCase(l.getStatus()) || "PENDING".equalsIgnoreCase(l.getStatus())) {
                    String st = "APPROVED".equalsIgnoreCase(l.getStatus()) ? "LEAVE" : "PENDING_LEAVE";
                    LocalDate start = l.getFromDate();
                    LocalDate end = l.getToDate();
                    if (start != null && end != null) {
                        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
                            if (!date.isBefore(from) && !date.isAfter(to)) {
                                recordMap.putIfAbsent(date, st);
                            }
                        }
                    }
                }
            }
        }

        // WFH requests (Approved & Pending)
        List<com.msil.iteadeptportal.attendance.model.WfhRequest> wfhs = wfhRequestRepository.findByUserId(userId);
        if (wfhs != null) {
            for (var w : wfhs) {
                if ("APPROVED".equalsIgnoreCase(w.getStatus()) || "PENDING".equalsIgnoreCase(w.getStatus())) {
                    String st = "APPROVED".equalsIgnoreCase(w.getStatus()) ? "WFH" : "PENDING_WFH";
                    LocalDate wDate = w.getWfhDate();
                    if (wDate != null && !wDate.isBefore(from) && !wDate.isAfter(to)) {
                        recordMap.putIfAbsent(wDate, st);
                    }
                }
            }
        }

        // Holidays keyed by date
        Set<LocalDate> holidayDates = holidayRepository
                .findByHolidayDateBetweenOrderByHolidayDateAsc(from, to)
                .stream()
                .map(Holiday::getHolidayDate)
                .collect(Collectors.toSet());

        List<CalendarDayDTO> result = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            String status;
            if (recordMap.containsKey(d)) {
                status = recordMap.get(d);
            } else if (holidayDates.contains(d)) {
                status = "HOLIDAY";
            } else if (d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY) {
                status = "WEEKEND";
            } else if (d.isAfter(LocalDate.now())) {
                status = "UPCOMING";
            } else {
                status = "ABSENT";
            }
            result.add(CalendarDayDTO.builder().date(d).status(status).build());
        }
        return result;
    }

    // ─── History ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PaginatedResponse<AttendanceHistoryDTO> getHistory(
            Long userId, LocalDate fromDate, LocalDate toDate,
            String status, int page, int size, String sort) {

        Sort sortObj = parseSort(sort);
        Pageable pageable = PageRequest.of(page, size, sortObj);

        Page<AttendanceRecord> recordPage;
        LocalDate from = fromDate != null ? fromDate : LocalDate.now().minusMonths(3);
        LocalDate to   = toDate   != null ? toDate   : LocalDate.now();

        if (status != null && !status.isBlank()) {
            recordPage = attendanceRepository.findByUserIdAndAttendanceDateBetween(userId, from, to, pageable)
                    // Post-filter on status (avoids complex spec for now)
                    .map(r -> r);
            // Re-query with status filter using JPA stream filter approach
            List<AttendanceRecord> filtered = attendanceRepository
                    .findByUserIdAndAttendanceDateBetween(userId, from, to).stream()
                    .filter(r -> status.equalsIgnoreCase(r.getAttendanceStatus()))
                    .collect(Collectors.toList());
            int start = (int) pageable.getOffset();
            int end   = Math.min(start + size, filtered.size());
            List<AttendanceHistoryDTO> content = (start > filtered.size()) ? List.of()
                    : filtered.subList(start, end).stream().map(this::toHistoryDTO).collect(Collectors.toList());
            return PaginatedResponse.<AttendanceHistoryDTO>builder()
                    .content(content)
                    .page(page)
                    .size(size)
                    .totalElements(filtered.size())
                    .totalPages((int) Math.ceil((double) filtered.size() / size))
                    .build();
        }

        recordPage = attendanceRepository.findByUserIdAndAttendanceDateBetween(userId, from, to, pageable);
        return PaginatedResponse.<AttendanceHistoryDTO>builder()
                .content(recordPage.getContent().stream().map(this::toHistoryDTO).collect(Collectors.toList()))
                .page(recordPage.getNumber())
                .size(recordPage.getSize())
                .totalElements(recordPage.getTotalElements())
                .totalPages(recordPage.getTotalPages())
                .build();
    }

    // ─── Search (Team/Admin) ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PaginatedResponse<AttendanceSearchResultDTO> searchAttendance(
            String search, String status, LocalDate fromDate, LocalDate toDate,
            int page, int size, String sort) {

        Pageable pageable = PageRequest.of(page, size);
        String fromStr  = fromDate != null ? fromDate.toString() : null;
        String toStr    = toDate   != null ? toDate.toString()   : null;
        String statusVal = (status != null && !status.isBlank()) ? status : null;
        String searchVal = (search != null && !search.isBlank()) ? search : null;

        Page<AttendanceSearchProjection> resultPage = attendanceRepository
                .searchWithUserInfo(statusVal, fromStr, toStr, searchVal, pageable);

        List<AttendanceSearchResultDTO> content = resultPage.getContent().stream()
                .map(p -> AttendanceSearchResultDTO.builder()
                        .employeeId(p.getEmployeeId())
                        .employeeName(p.getDisplayName())
                        .date(p.getAttendanceDate())
                        .status(p.getAttendanceStatus())
                        .workingMinutes(p.getWorkingMinutes())
                        .build())
                .collect(Collectors.toList());

        return PaginatedResponse.<AttendanceSearchResultDTO>builder()
                .content(content)
                .page(resultPage.getNumber())
                .size(resultPage.getSize())
                .totalElements(resultPage.getTotalElements())
                .totalPages(resultPage.getTotalPages())
                .build();
    }

    // ─── Team Attendance ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AttendanceStatusDTO getStatus(Long userId) {
        LocalDate today = LocalDate.now();
        Optional<AttendanceRecord> opt = attendanceRepository.findByUserIdAndAttendanceDate(userId, today);
        if (opt.isEmpty()) {
            return AttendanceStatusDTO.builder()
                    .isCheckedIn(false)
                    .isCheckedOut(false)
                    .workingHours("0h 0m")
                    .currentSessionDuration("0h 0m")
                    .status("NOT_CHECKED_IN")
                    .build();
        }
        AttendanceRecord r = opt.get();
        boolean checkedIn = r.getCheckInTime() != null;
        boolean checkedOut = r.getCheckOutTime() != null;
        
        long totalMinutes = r.getWorkingMinutes() != null ? r.getWorkingMinutes() : 0;
        long sessionMinutes = 0;
        if (checkedIn && !checkedOut) {
            sessionMinutes = ChronoUnit.MINUTES.between(r.getCheckInTime(), LocalDateTime.now());
            totalMinutes = sessionMinutes;
        }

        String workingHours = (totalMinutes / 60) + "h " + (totalMinutes % 60) + "m";
        String sessionDuration = (sessionMinutes / 60) + "h " + (sessionMinutes % 60) + "m";

        return AttendanceStatusDTO.builder()
                .isCheckedIn(checkedIn)
                .isCheckedOut(checkedOut)
                .workingHours(workingHours)
                .currentSessionDuration(sessionDuration)
                .status(checkedOut ? r.getAttendanceStatus() : (checkedIn ? "CHECKED_IN" : "NOT_CHECKED_IN"))
                .build();
    }

    // ─── Team Attendance ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public TeamAttendanceDayDTO getTeamAttendance(LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        String dateStr = targetDate.toString();
        List<TeamMemberAttendanceDTO> team = attendanceRepository.getTeamAttendance(dateStr)
                .stream()
                .map(p -> TeamMemberAttendanceDTO.builder()
                        .employeeId(p.getEmployeeId())
                        .employeeName(p.getDisplayName())
                        .status(p.getStatus())
                        .checkInTime(p.getCheckInTime())
                        .checkOutTime(p.getCheckOutTime())
                        .workingMinutes(p.getWorkingMinutes())
                        .build())
                .collect(Collectors.toList());

        return TeamAttendanceDayDTO.builder()
                .date(targetDate)
                .teamAttendance(team)
                .build();
    }

    @Transactional(readOnly = true)
    public TeamAttendanceSummaryDTO getTeamAttendanceSummary(LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        List<AttendanceRecord> records = attendanceRepository.findByAttendanceDate(targetDate);
        long present = 0, absent = 0, leave = 0, wfh = 0, checkedIn = 0, checkedOut = 0;
        if (records != null) {
            for (AttendanceRecord r : records) {
                if ("PRESENT".equalsIgnoreCase(r.getAttendanceStatus())) present++;
                else if ("ABSENT".equalsIgnoreCase(r.getAttendanceStatus())) absent++;
                else if ("LEAVE".equalsIgnoreCase(r.getAttendanceStatus())) leave++;
                else if ("WFH".equalsIgnoreCase(r.getAttendanceStatus())) wfh++;
                
                if (r.getCheckInTime() != null) checkedIn++;
                if (r.getCheckOutTime() != null) checkedOut++;
            }
        }
        return TeamAttendanceSummaryDTO.builder()
                .totalPresent(present)
                .totalAbsent(absent)
                .totalLeave(leave)
                .totalWfh(wfh)
                .totalCheckedIn(checkedIn)
                .totalCheckedOut(checkedOut)
                .build();
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<AttendanceSearchResultDTO> getEmployeeAttendance(
            String employeeId, LocalDate fromDate, LocalDate toDate, int page, int size) {
        return searchAttendance(employeeId, null, fromDate, toDate, page, size, "attendanceDate,desc");
    }

    @Transactional(readOnly = true)
    public byte[] exportAttendanceReport(LocalDate fromDate, LocalDate toDate, String format) {
        List<TeamReportEntryDTO> reportEntries = getTeamReport(
                fromDate != null ? fromDate : LocalDate.now().minusDays(30),
                toDate != null ? toDate : LocalDate.now()
        );

        StringBuilder sb = new StringBuilder();
        sb.append("Employee ID,Employee Name,Present,Absent,Leave,WFH,Half Day,Working Minutes\n");
        for (TeamReportEntryDTO entry : reportEntries) {
            sb.append(entry.getEmployeeId()).append(",")
              .append("\"").append(entry.getEmployeeName()).append("\",")
              .append(entry.getPresent()).append(",")
              .append(entry.getAbsent()).append(",")
              .append(entry.getLeave()).append(",")
              .append(entry.getWfh()).append(",")
              .append(entry.getHalfDay()).append(",")
              .append(entry.getWorkingMinutes()).append("\n");
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    // ─── Personal Report ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AttendanceReportDTO getReport(Long userId, String employeeId, String displayName,
                                         LocalDate fromDate, LocalDate toDate) {
        String fromStr = fromDate.toString();
        String toStr   = toDate.toString();

        Map<String, Long> counts = new HashMap<>();
        attendanceRepository.countByStatusForUser(userId, fromStr, toStr)
                .forEach(p -> counts.put(p.getStatus(), p.getCnt()));

        Long totalMinutes = attendanceRepository.sumWorkingMinutes(userId, fromDate, toDate);

        AttendanceSummaryDTO summary = AttendanceSummaryDTO.builder()
                .present(counts.getOrDefault("PRESENT",  0L).intValue())
                .absent(counts.getOrDefault("ABSENT",    0L).intValue())
                .leave(counts.getOrDefault("LEAVE",      0L).intValue())
                .wfh(counts.getOrDefault("WFH",          0L).intValue())
                .halfDay(counts.getOrDefault("HALF_DAY", 0L).intValue())
                .build();

        return AttendanceReportDTO.builder()
                .employeeId(employeeId)
                .employeeName(displayName)
                .summary(summary)
                .workingMinutes(totalMinutes != null ? totalMinutes : 0L)
                .build();
    }

    // ─── Team Report ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TeamReportEntryDTO> getTeamReport(LocalDate fromDate, LocalDate toDate) {
        return attendanceRepository.getTeamReport(fromDate.toString(), toDate.toString())
                .stream()
                .map(p -> TeamReportEntryDTO.builder()
                        .employeeId(p.getEmployeeId())
                        .employeeName(p.getDisplayName())
                        .present(p.getPresentCount()  != null ? p.getPresentCount()  : 0L)
                        .absent(p.getAbsentCount()    != null ? p.getAbsentCount()   : 0L)
                        .leave(p.getLeaveCount()      != null ? p.getLeaveCount()    : 0L)
                        .wfh(p.getWfhCount()          != null ? p.getWfhCount()      : 0L)
                        .halfDay(p.getHalfDayCount()  != null ? p.getHalfDayCount()  : 0L)
                        .workingMinutes(p.getTotalWorkingMinutes() != null ? p.getTotalWorkingMinutes() : 0L)
                        .build())
                .collect(Collectors.toList());
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private TodayAttendanceDTO toTodayDTO(AttendanceRecord r) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("HH:mm");
        return TodayAttendanceDTO.builder()
                .attendanceDate(r.getAttendanceDate())
                .checkInTime(r.getCheckInTime()   != null ? r.getCheckInTime().format(fmt)  : null)
                .checkOutTime(r.getCheckOutTime() != null ? r.getCheckOutTime().format(fmt) : null)
                .workingMinutes(r.getWorkingMinutes())
                .status(r.getAttendanceStatus())
                .build();
    }

    private AttendanceHistoryDTO toHistoryDTO(AttendanceRecord r) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("HH:mm");
        return AttendanceHistoryDTO.builder()
                .attendanceDate(r.getAttendanceDate())
                .status(r.getAttendanceStatus())
                .workingMinutes(r.getWorkingMinutes())
                .checkInTime(r.getCheckInTime()   != null ? r.getCheckInTime().format(fmt)  : null)
                .checkOutTime(r.getCheckOutTime() != null ? r.getCheckOutTime().format(fmt) : null)
                .build();
    }

    private Sort parseSort(String sort) {
        if (sort == null || !sort.contains(",")) {
            return Sort.by(Sort.Direction.DESC, "attendanceDate");
        }
        String[] parts = sort.split(",");
        return Sort.by(Sort.Direction.fromString(parts[1].trim()), parts[0].trim());
    }
}

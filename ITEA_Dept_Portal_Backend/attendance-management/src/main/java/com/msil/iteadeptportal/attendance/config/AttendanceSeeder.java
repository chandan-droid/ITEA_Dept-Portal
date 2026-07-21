package com.msil.iteadeptportal.attendance.config;

import com.msil.iteadeptportal.attendance.model.Holiday;
import com.msil.iteadeptportal.attendance.model.LeaveBalance;
import com.msil.iteadeptportal.attendance.model.LeaveType;
import com.msil.iteadeptportal.attendance.repository.HolidayRepository;
import com.msil.iteadeptportal.attendance.repository.LeaveBalanceRepository;
import com.msil.iteadeptportal.attendance.repository.LeaveTypeRepository;
import com.msil.iteadeptportal.employee.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class AttendanceSeeder implements CommandLineRunner {

    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final HolidayRepository holidayRepository;
    private final UserRepository userRepository; // Allowed since attendance-management depends on employee-management
    private final jakarta.persistence.EntityManager entityManager;

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void run(String... args) {
        // 1. Seed Leave Types
        LeaveType sickLeave = seedLeaveType("Sick Leave", "Paid time off for sickness or medical reasons", 12);
        LeaveType casualLeave = seedLeaveType("Casual Leave", "Paid time off for personal matters", 15);
        LeaveType annualLeave = seedLeaveType("Earned Leave", "Annual vacation leave", 20);

        // 2. Seed Holidays for 2026
        seedHoliday(LocalDate.of(2026, 1, 1), "New Year's Day", "COMPANY", false);
        seedHoliday(LocalDate.of(2026, 1, 26), "Republic Day", "NATIONAL", false);
        seedHoliday(LocalDate.of(2026, 3, 6), "Holi", "FESTIVAL", false);
        seedHoliday(LocalDate.of(2026, 8, 15), "Independence Day", "NATIONAL", false);
        seedHoliday(LocalDate.of(2026, 10, 2), "Gandhi Jayanti", "NATIONAL", false);
        seedHoliday(LocalDate.of(2026, 11, 8), "Diwali", "FESTIVAL", false);
        seedHoliday(LocalDate.of(2026, 12, 25), "Christmas", "FESTIVAL", false);

        // Optional holidays
        seedHoliday(LocalDate.of(2026, 4, 14), "Ambedkar Jayanti", "NATIONAL", true);
        seedHoliday(LocalDate.of(2026, 9, 5), "Janmashtami", "FESTIVAL", true);

        // 3. Seed Leave Balances for all users
        int currentYear = LocalDate.now().getYear();
        userRepository.findAll().forEach(user -> {
            seedLeaveBalance(user.getUserId(), sickLeave.getLeaveTypeId(), 12, currentYear);
            seedLeaveBalance(user.getUserId(), casualLeave.getLeaveTypeId(), 15, currentYear);
            seedLeaveBalance(user.getUserId(), annualLeave.getLeaveTypeId(), 20, currentYear);
        });
    }

    private LeaveType seedLeaveType(String name, String desc, int maxDays) {
        return leaveTypeRepository.findByTypeName(name)
                .orElseGet(() -> leaveTypeRepository.save(LeaveType.builder()
                        .leaveName(name)
                        .typeName(name)
                        .description(desc)
                        .isPaid(true)
                        .maxDaysPerYear(maxDays)
                        .build()));
    }

    private void seedHoliday(LocalDate date, String name, String type, boolean isOptional) {
        if (!holidayRepository.existsByHolidayDate(date)) {
            holidayRepository.save(Holiday.builder()
                    .holidayDate(date)
                    .holidayName(name)
                    .holidayType(type)
                    .description(name)
                    .isOptional(isOptional)
                    .build());
        }
    }

    private void seedLeaveBalance(Long userId, Long leaveTypeId, int totalDays, int year) {
        boolean exists = leaveBalanceRepository.findByUserIdAndLeaveTypeIdAndYear(userId, leaveTypeId, year).isPresent();
        if (!exists) {
            leaveBalanceRepository.save(LeaveBalance.builder()
                    .userId(userId)
                    .leaveTypeId(leaveTypeId)
                    .allocatedDays(java.math.BigDecimal.valueOf(totalDays))
                    .totalDays(totalDays)
                    .usedDays(0)
                    .year(year)
                    .build());
        }
    }
}

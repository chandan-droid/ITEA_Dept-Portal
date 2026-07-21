package com.msil.iteadeptportal.attendance.service;

import com.msil.iteadeptportal.attendance.api.*;
import com.msil.iteadeptportal.attendance.model.LeaveBalance;
import com.msil.iteadeptportal.attendance.model.LeaveRequest;
import com.msil.iteadeptportal.attendance.model.LeaveType;
import com.msil.iteadeptportal.attendance.model.WfhRequest;
import com.msil.iteadeptportal.attendance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.shared.event.NotificationEvent;
import org.springframework.context.ApplicationEventPublisher;

import java.util.ArrayList;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Transactional
public class LeaveService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final WfhRequestRepository wfhRequestRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final UserFacade userFacade;

    // ─── Leave Types ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LeaveTypeDTO> getAllLeaveTypes() {
        return leaveTypeRepository.findAll().stream()
                .map(lt -> LeaveTypeDTO.builder()
                        .leaveTypeId(lt.getLeaveTypeId())
                        .typeName(lt.getTypeName())
                        .description(lt.getDescription())
                        .maxDaysPerYear(lt.getMaxDaysPerYear())
                        .build())
                .collect(Collectors.toList());
    }

    // ─── Leave Balances ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LeaveBalanceDTO> getLeaveBalances(Long userId) {
        int year = LocalDate.now().getYear();
        return leaveBalanceRepository.findByUserIdAndYear(userId, year).stream()
                .map(lb -> {
                    String typeName = leaveTypeRepository.findById(lb.getLeaveTypeId())
                            .map(LeaveType::getTypeName).orElse("Unknown");
                    return LeaveBalanceDTO.builder()
                            .leaveTypeId(lb.getLeaveTypeId())
                            .leaveTypeName(typeName)
                            .totalDays(lb.getTotalDays())
                            .usedDays(lb.getUsedDays())
                            .remainingDays(lb.getTotalDays() - lb.getUsedDays())
                            .year(lb.getYear())
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ─── Submit Leave ─────────────────────────────────────────────────────────

    public LeaveRequestDTO submitLeave(Long userId, LeaveRequestDTO dto) {
        if (dto.getFromDate() == null || dto.getToDate() == null) {
            throw new IllegalArgumentException("From date and to date are required.");
        }
        if (dto.getToDate().isBefore(dto.getFromDate())) {
            throw new IllegalArgumentException("To date must be after or equal to from date.");
        }
        if (dto.getLeaveTypeId() == null) {
            throw new IllegalArgumentException("Leave type is required.");
        }

        long days = ChronoUnit.DAYS.between(dto.getFromDate(), dto.getToDate()) + 1;

        LeaveRequest request = LeaveRequest.builder()
                .userId(userId)
                .leaveTypeId(dto.getLeaveTypeId())
                .fromDate(dto.getFromDate())
                .toDate(dto.getToDate())
                .startDate(dto.getFromDate())
                .endDate(dto.getToDate())
                .totalDays(java.math.BigDecimal.valueOf(days))
                .reason(dto.getReason())
                .status("PENDING")
                .appliedAt(LocalDateTime.now())
                .build();

        LeaveRequest saved = leaveRequestRepository.save(request);

        // Notify managers/approvers excluding applicant
        try {
            eventPublisher.publishEvent(new NotificationEvent(
                    getManagerOrAdminUserIds(userId),
                    "LEAVE",
                    "New Leave Request Submitted",
                    "Leave request from " + saved.getFromDate() + " to " + saved.getToDate() + " has been submitted.",
                    "LEAVE",
                    saved.getLeaveRequestId(),
                    userId
            ));
        } catch (Exception e) {
            // Log warning without failing leave submission
        }

        return mapToDTO(saved);
    }

    // ─── Get Leave Requests ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LeaveRequestDTO> getMyLeaveRequests(Long userId) {
        return leaveRequestRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestDTO> getPendingRequests() {
        return leaveRequestRepository.findByStatus("PENDING").stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ─── Approve Leave ────────────────────────────────────────────────────────

    public LeaveRequestDTO approveLeave(Long requestId, Long approverId) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found: " + requestId));

        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateException("Leave request is no longer pending.");
        }

        request.setStatus("APPROVED");
        request.setApprovedBy(approverId);
        request.setApprovedAt(LocalDateTime.now());
        leaveRequestRepository.save(request);

        // Deduct from leave balance
        long days = ChronoUnit.DAYS.between(request.getFromDate(), request.getToDate()) + 1;
        int year = request.getFromDate().getYear();
        leaveBalanceRepository.findByUserIdAndLeaveTypeIdAndYear(request.getUserId(), request.getLeaveTypeId(), year)
                .ifPresent(lb -> {
                    lb.setUsedDays(lb.getUsedDays() + (int) days);
                    leaveBalanceRepository.save(lb);
                });

        // Notify applicant excluding manager actor
        try {
            eventPublisher.publishEvent(new NotificationEvent(
                    List.of(request.getUserId()),
                    "LEAVE",
                    "Leave Request Approved",
                    "Your leave request from " + request.getFromDate() + " to " + request.getToDate() + " has been approved.",
                    "LEAVE",
                    request.getLeaveRequestId(),
                    approverId
            ));
        } catch (Exception e) {
            // Ignore notification error
        }

        return mapToDTO(request);
    }

    // ─── Reject Leave ─────────────────────────────────────────────────────────

    public LeaveRequestDTO rejectLeave(Long requestId, Long approverId, String rejectionReason) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found: " + requestId));

        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateException("Leave request is no longer pending.");
        }

        request.setStatus("REJECTED");
        request.setApprovedBy(approverId);
        request.setApprovedAt(LocalDateTime.now());
        request.setRejectionReason(rejectionReason);
        leaveRequestRepository.save(request);

        // Notify applicant excluding manager actor
        try {
            eventPublisher.publishEvent(new NotificationEvent(
                    List.of(request.getUserId()),
                    "LEAVE",
                    "Leave Request Rejected",
                    "Your leave request from " + request.getFromDate() + " to " + request.getToDate() + " was rejected." + (rejectionReason != null ? " Reason: " + rejectionReason : ""),
                    "LEAVE",
                    request.getLeaveRequestId(),
                    approverId
            ));
        } catch (Exception e) {
            // Ignore notification error
        }

        return mapToDTO(request);
    }

    // ─── WFH Requests ─────────────────────────────────────────────────────────

    public WfhRequestDTO submitWfh(Long userId, WfhRequestDTO dto) {
        if (dto.getWfhDate() == null) {
            throw new IllegalArgumentException("WFH date is required.");
        }
        WfhRequest request = WfhRequest.builder()
                .userId(userId)
                .requestDate(LocalDate.now())
                .wfhDate(dto.getWfhDate())
                .reason(dto.getReason())
                .status("PENDING")
                .build();
        WfhRequest saved = wfhRequestRepository.save(request);

        // Notify managers excluding applicant
        try {
            eventPublisher.publishEvent(new NotificationEvent(
                    getManagerOrAdminUserIds(userId),
                    "WFH",
                    "New WFH Request Submitted",
                    "Work From Home request for date " + saved.getWfhDate() + " has been submitted.",
                    "WFH",
                    saved.getWfhRequestId(),
                    userId
            ));
        } catch (Exception e) {
            // Ignore notification error
        }

        return mapWfhToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<WfhRequestDTO> getMyWfhRequests(Long userId) {
        return wfhRequestRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 50))
                .getContent().stream()
                .map(this::mapWfhToDTO)
                .collect(Collectors.toList());
    }

    public WfhRequestDTO approveWfh(Long requestId, Long approverId) {
        WfhRequest request = wfhRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("WFH request not found: " + requestId));
        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateException("WFH request is no longer pending.");
        }
        request.setStatus("APPROVED");
        request.setApprovedBy(approverId);
        request.setApprovedAt(LocalDateTime.now());
        wfhRequestRepository.save(request);

        // Notify applicant excluding manager actor
        try {
            eventPublisher.publishEvent(new NotificationEvent(
                    List.of(request.getUserId()),
                    "WFH",
                    "WFH Request Approved",
                    "Your WFH request for " + request.getWfhDate() + " has been approved.",
                    "WFH",
                    request.getWfhRequestId(),
                    approverId
            ));
        } catch (Exception e) {
            // Ignore notification error
        }

        return mapWfhToDTO(request);
    }

    public WfhRequestDTO rejectWfh(Long requestId, Long approverId) {
        WfhRequest request = wfhRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("WFH request not found: " + requestId));
        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateException("WFH request is no longer pending.");
        }
        request.setStatus("REJECTED");
        request.setApprovedBy(approverId);
        request.setApprovedAt(LocalDateTime.now());
        wfhRequestRepository.save(request);

        // Notify applicant excluding manager actor
        try {
            eventPublisher.publishEvent(new NotificationEvent(
                    List.of(request.getUserId()),
                    "WFH",
                    "WFH Request Rejected",
                    "Your WFH request for " + request.getWfhDate() + " was rejected.",
                    "WFH",
                    request.getWfhRequestId(),
                    approverId
            ));
        } catch (Exception e) {
            // Ignore notification error
        }

        return mapWfhToDTO(request);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private LeaveRequestDTO mapToDTO(LeaveRequest r) {
        String typeName = leaveTypeRepository.findById(r.getLeaveTypeId())
                .map(LeaveType::getTypeName).orElse("Unknown");

        String empId = null;
        String empName = null;
        String email = null;
        if (r.getUserId() != null && userFacade != null) {
            try {
                var optUser = userFacade.getUserById(r.getUserId());
                if (optUser.isPresent()) {
                    empId = optUser.get().getEmployeeId();
                    empName = optUser.get().getDisplayName();
                    email = optUser.get().getEmail();
                }
            } catch (Exception e) {
                // Fallback
            }
        }

        int totalDays = 1;
        if (r.getFromDate() != null && r.getToDate() != null) {
            totalDays = (int) (java.time.temporal.ChronoUnit.DAYS.between(r.getFromDate(), r.getToDate()) + 1);
        }

        return LeaveRequestDTO.builder()
                .leaveRequestId(r.getLeaveRequestId())
                .leaveTypeId(r.getLeaveTypeId())
                .leaveTypeName(typeName)
                .userId(r.getUserId())
                .employeeId(empId)
                .employeeName(empName)
                .email(email)
                .fromDate(r.getFromDate())
                .toDate(r.getToDate())
                .totalDays(totalDays)
                .reason(r.getReason())
                .status(r.getStatus())
                .rejectionReason(r.getRejectionReason())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private WfhRequestDTO mapWfhToDTO(WfhRequest r) {
        String empId = null;
        String empName = null;
        String email = null;
        if (r.getUserId() != null && userFacade != null) {
            try {
                var optUser = userFacade.getUserById(r.getUserId());
                if (optUser.isPresent()) {
                    empId = optUser.get().getEmployeeId();
                    empName = optUser.get().getDisplayName();
                    email = optUser.get().getEmail();
                }
            } catch (Exception e) {
                // Fallback
            }
        }

        return WfhRequestDTO.builder()
                .wfhRequestId(r.getWfhRequestId())
                .userId(r.getUserId())
                .employeeId(empId)
                .employeeName(empName)
                .email(email)
                .wfhDate(r.getWfhDate())
                .reason(r.getReason())
                .status(r.getStatus())
                .createdAt(r.getCreatedAt())
                .build();
    }

    public LeaveRequestDTO cancelLeave(Long requestId, Long userId) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found: " + requestId));

        if (!request.getUserId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("You can only cancel your own leave requests.");
        }

        if (!"PENDING".equalsIgnoreCase(request.getStatus())) {
            throw new IllegalStateException("Only pending leave requests can be cancelled. Current status: " + request.getStatus());
        }

        request.setStatus("CANCELLED");
        leaveRequestRepository.save(request);
        return mapToDTO(request);
    }

    public WfhRequestDTO cancelWfh(Long requestId, Long userId) {
        WfhRequest request = wfhRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("WFH request not found: " + requestId));

        if (!request.getUserId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("You can only cancel your own WFH requests.");
        }

        if (!"PENDING".equalsIgnoreCase(request.getStatus())) {
            throw new IllegalStateException("Only pending WFH requests can be cancelled. Current status: " + request.getStatus());
        }

        request.setStatus("CANCELLED");
        wfhRequestRepository.save(request);
        return mapWfhToDTO(request);
    }

    @Transactional(readOnly = true)
    public WfhRequestDTO getWfhById(Long requestId, Long userId) {
        WfhRequest request = wfhRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("WFH request not found: " + requestId));
        return mapWfhToDTO(request);
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestDTO> getTeamLeaveRequests() {
        return leaveRequestRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WfhRequestDTO> getTeamWfhRequests() {
        return wfhRequestRepository.findAll().stream()
                .map(this::mapWfhToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WfhRequestDTO> getPendingWfhRequests() {
        return wfhRequestRepository.findByStatus("PENDING").stream()
                .map(this::mapWfhToDTO)
                .collect(Collectors.toList());
    }

    private List<Long> getManagerOrAdminUserIds(Long excludeUserId) {
        try {
            if (userFacade != null) {
                List<Long> activeIds = userFacade.getAllActiveUserIds();
                if (activeIds != null) {
                    return activeIds.stream().filter(id -> id != null && !id.equals(excludeUserId)).toList();
                }
            }
        } catch (Exception e) {
            // Fallback
        }
        return Collections.emptyList();
    }
}

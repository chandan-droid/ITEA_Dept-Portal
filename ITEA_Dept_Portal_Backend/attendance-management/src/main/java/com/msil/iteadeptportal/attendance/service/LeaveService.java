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
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class LeaveService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final WfhRequestRepository wfhRequestRepository;

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

        LeaveRequest request = LeaveRequest.builder()
                .userId(userId)
                .leaveTypeId(dto.getLeaveTypeId())
                .fromDate(dto.getFromDate())
                .toDate(dto.getToDate())
                .reason(dto.getReason())
                .status("PENDING")
                .build();

        LeaveRequest saved = leaveRequestRepository.save(request);
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
        leaveRequestRepository.save(request);

        // Deduct from leave balance
        long days = ChronoUnit.DAYS.between(request.getFromDate(), request.getToDate()) + 1;
        int year = request.getFromDate().getYear();
        leaveBalanceRepository.findByUserIdAndLeaveTypeIdAndYear(request.getUserId(), request.getLeaveTypeId(), year)
                .ifPresent(lb -> {
                    lb.setUsedDays(lb.getUsedDays() + (int) days);
                    leaveBalanceRepository.save(lb);
                });

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
        request.setRejectionReason(rejectionReason);
        leaveRequestRepository.save(request);
        return mapToDTO(request);
    }

    // ─── WFH Requests ─────────────────────────────────────────────────────────

    public WfhRequestDTO submitWfh(Long userId, WfhRequestDTO dto) {
        if (dto.getWfhDate() == null) {
            throw new IllegalArgumentException("WFH date is required.");
        }
        WfhRequest request = WfhRequest.builder()
                .userId(userId)
                .wfhDate(dto.getWfhDate())
                .reason(dto.getReason())
                .status("PENDING")
                .build();
        WfhRequest saved = wfhRequestRepository.save(request);
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
        wfhRequestRepository.save(request);
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
        wfhRequestRepository.save(request);
        return mapWfhToDTO(request);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private LeaveRequestDTO mapToDTO(LeaveRequest r) {
        String typeName = leaveTypeRepository.findById(r.getLeaveTypeId())
                .map(LeaveType::getTypeName).orElse("Unknown");
        return LeaveRequestDTO.builder()
                .leaveRequestId(r.getLeaveRequestId())
                .leaveTypeId(r.getLeaveTypeId())
                .leaveTypeName(typeName)
                .fromDate(r.getFromDate())
                .toDate(r.getToDate())
                .reason(r.getReason())
                .status(r.getStatus())
                .rejectionReason(r.getRejectionReason())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private WfhRequestDTO mapWfhToDTO(WfhRequest r) {
        return WfhRequestDTO.builder()
                .wfhRequestId(r.getWfhRequestId())
                .wfhDate(r.getWfhDate())
                .reason(r.getReason())
                .status(r.getStatus())
                .createdAt(r.getCreatedAt())
                .build();
    }
}

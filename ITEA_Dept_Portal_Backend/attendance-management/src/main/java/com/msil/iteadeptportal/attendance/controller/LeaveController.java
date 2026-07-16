package com.msil.iteadeptportal.attendance.controller;

import com.msil.iteadeptportal.attendance.api.*;
import com.msil.iteadeptportal.attendance.service.LeaveService;
import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.shared.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;
    private final UserFacade userFacade;

    @GetMapping("/types")
    @PreAuthorize("hasAuthority('LEAVE_VIEW_SELF')")
    public ResponseEntity<ApiResponse<List<LeaveTypeDTO>>> getLeaveTypes() {
        return ResponseEntity.ok(ApiResponse.success(leaveService.getAllLeaveTypes(), "Leave types retrieved."));
    }

    @GetMapping("/balances")
    @PreAuthorize("hasAuthority('LEAVE_VIEW_SELF')")
    public ResponseEntity<ApiResponse<List<LeaveBalanceDTO>>> getLeaveBalances() {
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.getLeaveBalances(userId), "Leave balances retrieved."));
    }

    @PostMapping("/requests")
    @PreAuthorize("hasAuthority('LEAVE_CREATE')")
    public ResponseEntity<ApiResponse<LeaveRequestDTO>> submitLeaveRequest(@RequestBody LeaveRequestDTO dto) {
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.submitLeave(userId, dto), "Leave request submitted successfully."));
    }

    @GetMapping("/requests/my")
    @PreAuthorize("hasAuthority('LEAVE_VIEW_SELF')")
    public ResponseEntity<ApiResponse<List<LeaveRequestDTO>>> getMyRequests() {
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.getMyLeaveRequests(userId), "My leave requests retrieved."));
    }

    @GetMapping("/requests/pending")
    @PreAuthorize("hasAuthority('LEAVE_APPROVE')")
    public ResponseEntity<ApiResponse<List<LeaveRequestDTO>>> getPendingRequests() {
        return ResponseEntity.ok(ApiResponse.success(leaveService.getPendingRequests(), "Pending leave requests retrieved."));
    }

    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAuthority('LEAVE_APPROVE')")
    public ResponseEntity<ApiResponse<LeaveRequestDTO>> approveRequest(@PathVariable Long id) {
        Long approverId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.approveLeave(id, approverId), "Leave request approved."));
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasAuthority('LEAVE_REJECT')")
    public ResponseEntity<ApiResponse<LeaveRequestDTO>> rejectRequest(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "Rejected by manager") String reason) {
        Long approverId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.rejectLeave(id, approverId, reason), "Leave request rejected."));
    }

    private Long resolveUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userFacade.getUserBySamAccountName(username)
                .map(UserDTO::getUserId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + username));
    }
}

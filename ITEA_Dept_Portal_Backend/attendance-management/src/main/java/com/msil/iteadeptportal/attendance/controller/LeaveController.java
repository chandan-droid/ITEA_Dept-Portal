package com.msil.iteadeptportal.attendance.controller;

import com.msil.iteadeptportal.attendance.api.*;
import com.msil.iteadeptportal.attendance.service.LeaveService;
import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.shared.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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

    // ─── Submit Leave ─────────────────────────────────────────────────────────

    @PostMapping({"", "/requests"})
    @PreAuthorize("hasAuthority('LEAVE_CREATE')")
    public ResponseEntity<ApiResponse<LeaveRequestDTO>> submitLeaveRequest(@RequestBody LeaveRequestDTO dto) {
        validateIsEmployeeUser();
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.submitLeave(userId, dto), "Leave request submitted successfully."));
    }

    // ─── My Leave Requests ────────────────────────────────────────────────────

    @GetMapping({"/my", "/requests/my"})
    @PreAuthorize("hasAuthority('LEAVE_VIEW_SELF')")
    public ResponseEntity<ApiResponse<List<LeaveRequestDTO>>> getMyRequests() {
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.getMyLeaveRequests(userId), "My leave requests retrieved."));
    }

    // ─── Cancel Leave ─────────────────────────────────────────────────────────

    @PatchMapping({"/{id}/cancel", "/requests/{id}/cancel"})
    @PreAuthorize("hasAuthority('LEAVE_CANCEL')")
    public ResponseEntity<ApiResponse<LeaveRequestDTO>> cancelLeave(@PathVariable Long id) {
        validateIsEmployeeUser();
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.cancelLeave(id, userId), "Leave request cancelled."));
    }

    // ─── Team Leave Requests ──────────────────────────────────────────────────

    @GetMapping("/team")
    @PreAuthorize("hasAuthority('LEAVE_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<List<LeaveRequestDTO>>> getTeamLeaveRequests() {
        return ResponseEntity.ok(ApiResponse.success(leaveService.getTeamLeaveRequests(), "Team leave requests retrieved."));
    }

    // ─── Pending Leave Requests ───────────────────────────────────────────────

    @GetMapping({"/pending", "/requests/pending"})
    @PreAuthorize("hasAuthority('LEAVE_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<List<LeaveRequestDTO>>> getPendingRequests() {
        return ResponseEntity.ok(ApiResponse.success(leaveService.getPendingRequests(), "Pending leave requests retrieved."));
    }

    // ─── Approve Leave ────────────────────────────────────────────────────────

    @RequestMapping(value = {"/{id}/approve", "/requests/{id}/approve"}, method = {RequestMethod.PATCH, RequestMethod.POST})
    @PreAuthorize("hasAuthority('LEAVE_APPROVE')")
    public ResponseEntity<ApiResponse<LeaveRequestDTO>> approveRequest(@PathVariable Long id) {
        Long approverId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.approveLeave(id, approverId), "Leave request approved."));
    }

    // ─── Reject Leave ─────────────────────────────────────────────────────────

    @RequestMapping(value = {"/{id}/reject", "/requests/{id}/reject"}, method = {RequestMethod.PATCH, RequestMethod.POST})
    @PreAuthorize("hasAuthority('LEAVE_REJECT')")
    public ResponseEntity<ApiResponse<LeaveRequestDTO>> rejectRequest(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "Rejected by manager") String reason) {
        Long approverId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.rejectLeave(id, approverId, reason), "Leave request rejected."));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Long resolveUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userFacade.getUserBySamAccountName(username)
                .map(UserDTO::getUserId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + username));
    }

    private void validateIsEmployeeUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            boolean isManagerOrAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER")
                                || a.getAuthority().equals("ROLE_ADMIN")
                                || a.getAuthority().equals("LEAVE_APPROVE")
                                || a.getAuthority().equals("WFH_APPROVE")
                                || a.getAuthority().equals("HOLIDAY_MANAGE"));
            if (isManagerOrAdmin) {
                throw new AccessDeniedException("Managers and Administrators obtain Leave and WFH approvals outside the portal. Self-service operations are forbidden.");
            }
        }
    }
}

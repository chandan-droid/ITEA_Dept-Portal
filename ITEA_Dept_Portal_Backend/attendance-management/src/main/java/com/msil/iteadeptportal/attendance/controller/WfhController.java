package com.msil.iteadeptportal.attendance.controller;

import com.msil.iteadeptportal.attendance.api.WfhRequestDTO;
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
@RequestMapping("/api/wfh")
@RequiredArgsConstructor
public class WfhController {

    private final LeaveService leaveService;
    private final UserFacade userFacade;

    // ─── Submit WFH ───────────────────────────────────────────────────────────

    @PostMapping({"", "/requests"})
    @PreAuthorize("hasAuthority('WFH_CREATE')")
    public ResponseEntity<ApiResponse<WfhRequestDTO>> submitWfhRequest(@RequestBody WfhRequestDTO dto) {
        validateIsEmployeeUser();
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.submitWfh(userId, dto), "WFH request submitted successfully."));
    }

    // ─── My WFH Requests ──────────────────────────────────────────────────────

    @GetMapping({"/my", "/requests/my"})
    @PreAuthorize("hasAuthority('WFH_VIEW_SELF')")
    public ResponseEntity<ApiResponse<List<WfhRequestDTO>>> getMyRequests() {
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.getMyWfhRequests(userId), "My WFH requests retrieved."));
    }

    // ─── Get WFH Details ──────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('WFH_VIEW_SELF')")
    public ResponseEntity<ApiResponse<WfhRequestDTO>> getWfhById(@PathVariable Long id) {
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.getWfhById(id, userId), "WFH request details retrieved."));
    }

    // ─── Cancel WFH ───────────────────────────────────────────────────────────

    @PatchMapping({"/{id}/cancel", "/requests/{id}/cancel"})
    @PreAuthorize("hasAuthority('WFH_CANCEL')")
    public ResponseEntity<ApiResponse<WfhRequestDTO>> cancelWfh(@PathVariable Long id) {
        validateIsEmployeeUser();
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.cancelWfh(id, userId), "WFH request cancelled."));
    }

    // ─── Team WFH Requests ────────────────────────────────────────────────────

    @GetMapping("/team")
    @PreAuthorize("hasAuthority('WFH_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<List<WfhRequestDTO>>> getTeamWfhRequests() {
        return ResponseEntity.ok(ApiResponse.success(leaveService.getTeamWfhRequests(), "Team WFH requests retrieved."));
    }

    // ─── Pending WFH Requests ─────────────────────────────────────────────────

    @GetMapping({"/pending", "/requests/pending"})
    @PreAuthorize("hasAuthority('WFH_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<List<WfhRequestDTO>>> getPendingWfhRequests() {
        return ResponseEntity.ok(ApiResponse.success(leaveService.getPendingWfhRequests(), "Pending WFH requests retrieved."));
    }

    // ─── Approve WFH ──────────────────────────────────────────────────────────

    @RequestMapping(value = {"/{id}/approve", "/requests/{id}/approve"}, method = {RequestMethod.PATCH, RequestMethod.POST})
    @PreAuthorize("hasAuthority('WFH_APPROVE')")
    public ResponseEntity<ApiResponse<WfhRequestDTO>> approveRequest(@PathVariable Long id) {
        Long approverId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.approveWfh(id, approverId), "WFH request approved."));
    }

    // ─── Reject WFH ───────────────────────────────────────────────────────────

    @RequestMapping(value = {"/{id}/reject", "/requests/{id}/reject"}, method = {RequestMethod.PATCH, RequestMethod.POST})
    @PreAuthorize("hasAuthority('WFH_REJECT')")
    public ResponseEntity<ApiResponse<WfhRequestDTO>> rejectRequest(@PathVariable Long id) {
        Long approverId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.rejectWfh(id, approverId), "WFH request rejected."));
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

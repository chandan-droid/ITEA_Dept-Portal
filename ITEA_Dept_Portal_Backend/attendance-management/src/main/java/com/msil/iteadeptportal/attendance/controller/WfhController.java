package com.msil.iteadeptportal.attendance.controller;

import com.msil.iteadeptportal.attendance.api.WfhRequestDTO;
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
@RequestMapping("/api/wfh")
@RequiredArgsConstructor
public class WfhController {

    private final LeaveService leaveService;
    private final UserFacade userFacade;

    @PostMapping("/requests")
    @PreAuthorize("hasAuthority('WFH_CREATE')")
    public ResponseEntity<ApiResponse<WfhRequestDTO>> submitWfhRequest(@RequestBody WfhRequestDTO dto) {
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.submitWfh(userId, dto), "WFH request submitted successfully."));
    }

    @GetMapping("/requests/my")
    @PreAuthorize("hasAuthority('ATTENDANCE_VIEW_SELF')")
    public ResponseEntity<ApiResponse<List<WfhRequestDTO>>> getMyRequests() {
        Long userId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.getMyWfhRequests(userId), "My WFH requests retrieved."));
    }

    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAuthority('WFH_APPROVE')")
    public ResponseEntity<ApiResponse<WfhRequestDTO>> approveRequest(@PathVariable Long id) {
        Long approverId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.approveWfh(id, approverId), "WFH request approved."));
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasAuthority('WFH_APPROVE')") // Sharing approval permission or WFH_APPROVE
    public ResponseEntity<ApiResponse<WfhRequestDTO>> rejectRequest(@PathVariable Long id) {
        Long approverId = resolveUserId();
        return ResponseEntity.ok(ApiResponse.success(leaveService.rejectWfh(id, approverId), "WFH request rejected."));
    }

    private Long resolveUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userFacade.getUserBySamAccountName(username)
                .map(UserDTO::getUserId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + username));
    }
}

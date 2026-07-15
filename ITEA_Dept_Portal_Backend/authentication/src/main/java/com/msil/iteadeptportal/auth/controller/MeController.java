package com.msil.iteadeptportal.auth.controller;

import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.employee.api.UserMeDTO;
import com.msil.iteadeptportal.shared.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MeController {

    private final UserFacade userFacade;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserMeDTO>> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
        }

        String username = authentication.getName();
        try {
            UserMeDTO userMe = userFacade.getUserMeDetails(username);
            return ResponseEntity.ok(ApiResponse.success(userMe, "User profile retrieved successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }
}

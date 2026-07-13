package com.msil.iteadeptportal.employee.service;

import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.employee.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserFacadeImpl implements UserFacade {

    private final UserService userService;

    @Override
    public Optional<UserDTO> getUserBySamAccountName(String samAccountName) {
        return userService.getUserBySamAccountName(samAccountName)
                .map(user -> mapToDTO(user, userService.getUserRoleName(user.getUserId())));
    }

    @Override
    public UserDTO createOrUpdateUser(UserDTO userDTO) {
        User user = mapToEntity(userDTO);
        String roleName = userDTO.getRole() != null ? userDTO.getRole() : "ROLE_PORTAL_USER";
        User savedUser = userService.createOrUpdateUser(user, roleName);
        return mapToDTO(savedUser, roleName);
    }

    @Override
    public void auditLogin(Long userId, String jwtId, String ipAddress, String userAgent, String status, String failureReason) {
        userService.auditLogin(userId, jwtId, ipAddress, userAgent, status, failureReason);
    }

    private UserDTO mapToDTO(User user, String roleName) {
        if (user == null) return null;
        return UserDTO.builder()
                .userId(user.getUserId())
                .employeeId(user.getEmployeeId())
                .samAccountName(user.getSamAccountName())
                .userPrincipalName(user.getUserPrincipalName())
                .displayName(user.getDisplayName())
                .surname(user.getSurname())
                .email(user.getEmail())
                .status(user.getStatus())
                .firstLogin(user.getFirstLogin())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .role(roleName)
                .build();
    }

    private User mapToEntity(UserDTO dto) {
        if (dto == null) return null;
        return User.builder()
                .userId(dto.getUserId())
                .employeeId(dto.getEmployeeId())
                .samAccountName(dto.getSamAccountName())
                .userPrincipalName(dto.getUserPrincipalName())
                .displayName(dto.getDisplayName())
                .surname(dto.getSurname())
                .email(dto.getEmail())
                .status(dto.getStatus())
                .firstLogin(dto.getFirstLogin())
                .lastLoginAt(dto.getLastLoginAt())
                .createdAt(dto.getCreatedAt())
                .updatedAt(dto.getUpdatedAt())
                .build();
    }
}

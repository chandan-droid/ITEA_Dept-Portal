package com.msil.iteadeptportal.employee.service;

import com.msil.iteadeptportal.employee.api.EmployeeDetailsDTO;
import com.msil.iteadeptportal.employee.api.EmployeeSummaryDTO;
import com.msil.iteadeptportal.employee.api.RoleDTO;
import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.employee.api.UserMeDTO;
import com.msil.iteadeptportal.employee.model.Permission;
import com.msil.iteadeptportal.employee.model.Role;
import com.msil.iteadeptportal.employee.model.User;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

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

    @Override
    public UserMeDTO getUserMeDetails(String samAccountName) {
        User user = userService.getUserBySamAccountName(samAccountName)
                .orElseThrow(() -> new IllegalArgumentException("User not found with username: " + samAccountName));

        UserDTO userDTO = mapToDTO(user, userService.getUserRoleName(user.getUserId()));

        List<RoleDTO> roles = userService.getRolesByUserId(user.getUserId()).stream()
                .map(role -> RoleDTO.builder()
                        .roleId(role.getRoleId())
                        .roleName(role.getRoleName())
                        .build())
                .collect(Collectors.toList());

        List<Permission> permissions = userService.getPermissionsByUserId(user.getUserId());

        Map<String, List<String>> groupedPermissions = permissions.stream()
                .filter(p -> p.getModuleName() != null && !p.getModuleName().trim().isEmpty())
                .collect(Collectors.groupingBy(
                        Permission::getModuleName,
                        Collectors.mapping(Permission::getPermissionName, Collectors.toList())
                ));

        return UserMeDTO.builder()
                .user(userDTO)
                .roles(roles)
                .permissions(groupedPermissions)
                .build();
    }

    @Override
    public List<String> getUserAuthorities(String samAccountName) {
        Optional<User> userOpt = userService.getUserBySamAccountName(samAccountName);
        if (userOpt.isEmpty()) {
            return List.of();
        }
        User user = userOpt.get();
        List<String> authorities = new ArrayList<>();
        // Add roles
        List<Role> roles = userService.getRolesByUserId(user.getUserId());
        for (Role r : roles) {
            authorities.add(r.getRoleName());
        }
        // Add permissions
        List<Permission> permissions = userService.getPermissionsByUserId(user.getUserId());
        for (Permission p : permissions) {
            authorities.add(p.getPermissionName());
        }
        return authorities;
    }

    @Override
    public PaginatedResponse<EmployeeSummaryDTO> listEmployees(int page, int size, String search, String role, String status, String sort) {
        Page<User> userPage = userService.listEmployees(page, size, search, role, status, sort);

        List<EmployeeSummaryDTO> content = userPage.getContent().stream()
                .map(user -> {
                    List<String> roles = userService.getRolesByUserId(user.getUserId()).stream()
                            .map(Role::getRoleName)
                            .collect(Collectors.toList());

                    return EmployeeSummaryDTO.builder()
                            .userId(user.getUserId())
                            .employeeId(user.getEmployeeId())
                            .displayName(user.getDisplayName())
                            .email(user.getEmail())
                            .roles(roles)
                            .status(user.getStatus())
                            .lastLoginAt(user.getLastLoginAt())
                            .build();
                })
                .collect(Collectors.toList());

        return PaginatedResponse.<EmployeeSummaryDTO>builder()
                .content(content)
                .page(userPage.getNumber())
                .size(userPage.getSize())
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .build();
    }

    @Override
    public EmployeeDetailsDTO getEmployeeDetails(Long userId) {
        User user = userService.getUserById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        List<String> roles = userService.getRolesByUserId(user.getUserId()).stream()
                .map(Role::getRoleName)
                .collect(Collectors.toList());

        List<String> permissions = userService.getPermissionsByUserId(user.getUserId()).stream()
                .map(Permission::getPermissionName)
                .collect(Collectors.toList());

        return EmployeeDetailsDTO.builder()
                .userId(user.getUserId())
                .employeeId(user.getEmployeeId())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .status(user.getStatus())
                .roles(roles)
                .permissions(permissions)
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .build();
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

    @Override
    public void activateUser(Long userId) {
        userService.activateUser(userId);
    }

    @Override
    public void deactivateUser(Long userId) {
        userService.deactivateUser(userId);
    }
}

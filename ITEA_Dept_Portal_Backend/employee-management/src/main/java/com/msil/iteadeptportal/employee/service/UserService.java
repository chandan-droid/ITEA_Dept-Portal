package com.msil.iteadeptportal.employee.service;

import com.msil.iteadeptportal.employee.model.LoginAudit;
import com.msil.iteadeptportal.employee.model.Role;
import com.msil.iteadeptportal.employee.model.User;
import com.msil.iteadeptportal.employee.model.UserRole;
import com.msil.iteadeptportal.employee.repository.LoginAuditRepository;
import com.msil.iteadeptportal.employee.repository.RoleRepository;
import com.msil.iteadeptportal.employee.repository.UserRepository;
import com.msil.iteadeptportal.employee.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final LoginAuditRepository loginAuditRepository;

    @Transactional(readOnly = true)
    public Optional<User> getUserBySamAccountName(String samAccountName) {
        return userRepository.findBySamAccountName(samAccountName);
    }

    public User createOrUpdateUser(User user, String roleName) {
        Optional<User> existingUserOpt = userRepository.findBySamAccountName(user.getSamAccountName());
        User savedUser;
        if (existingUserOpt.isPresent()) {
            User existing = existingUserOpt.get();
            existing.setDisplayName(user.getDisplayName());
            existing.setSurname(user.getSurname());
            existing.setEmail(user.getEmail());
            existing.setStatus(user.getStatus());
            existing.setFirstLogin(user.getFirstLogin());
            existing.setLastLoginAt(user.getLastLoginAt());
            savedUser = userRepository.save(existing);
        } else {
            savedUser = userRepository.save(user);
        }

        // Link/Sync role
        Role role = roleRepository.findByRoleName(roleName)
                .orElseGet(() -> roleRepository.save(Role.builder().roleName(roleName).build()));

        // Sync user role mapping (clean existing and keep only the active mapped role)
        List<UserRole> existingRoles = userRoleRepository.findByUserId(savedUser.getUserId());
        boolean hasThisRole = false;
        for (UserRole ur : existingRoles) {
            if (ur.getRoleId().equals(role.getRoleId())) {
                hasThisRole = true;
            } else {
                userRoleRepository.delete(ur);
            }
        }
        if (!hasThisRole) {
            userRoleRepository.save(UserRole.builder()
                    .userId(savedUser.getUserId())
                    .roleId(role.getRoleId())
                    .build());
        }

        return savedUser;
    }

    @Transactional(readOnly = true)
    public String getUserRoleName(Long userId) {
        List<UserRole> userRoles = userRoleRepository.findByUserId(userId);
        if (!userRoles.isEmpty()) {
            Optional<Role> role = roleRepository.findById(userRoles.get(0).getRoleId());
            if (role.isPresent()) {
                return role.get().getRoleName();
            }
        }
        return "ROLE_PORTAL_USER";
    }

    public void auditLogin(Long userId, String jwtId, String ipAddress, String userAgent, String status, String failureReason) {
        UUID jti = null;
        if (jwtId != null && !jwtId.trim().isEmpty()) {
            try {
                jti = UUID.fromString(jwtId);
            } catch (Exception ignored) {}
        }
        LoginAudit audit = LoginAudit.builder()
                .userId(userId)
                .jwtId(jti)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .authenticationStatus(status)
                .failureReason(failureReason)
                .build();
        loginAuditRepository.save(audit);
    }
}

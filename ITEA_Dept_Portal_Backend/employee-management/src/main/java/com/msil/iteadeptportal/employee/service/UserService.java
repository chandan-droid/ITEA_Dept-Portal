package com.msil.iteadeptportal.employee.service;

import com.msil.iteadeptportal.employee.model.LoginAudit;
import com.msil.iteadeptportal.employee.model.Permission;
import com.msil.iteadeptportal.employee.model.Role;
import com.msil.iteadeptportal.employee.model.User;
import com.msil.iteadeptportal.employee.model.UserRole;
import com.msil.iteadeptportal.employee.repository.LoginAuditRepository;
import com.msil.iteadeptportal.employee.repository.PermissionRepository;
import com.msil.iteadeptportal.employee.repository.RoleRepository;
import com.msil.iteadeptportal.employee.repository.UserRepository;
import com.msil.iteadeptportal.employee.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Optional;
import java.util.Queue;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final LoginAuditRepository loginAuditRepository;
    private final PermissionRepository permissionRepository;

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

    @Transactional(readOnly = true)
    public List<Role> getRolesByUserId(Long userId) {
        return roleRepository.findRolesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<Permission> getPermissionsByUserId(Long userId) {
        // 1. Fetch directly assigned roles
        List<Role> directRoles = roleRepository.findRolesByUserId(userId);

        // 2. Queue and set to traverse hierarchy upwards without loops
        Set<Long> allRoleIds = new HashSet<>();
        Queue<Long> queue = new LinkedList<>();

        for (Role role : directRoles) {
            allRoleIds.add(role.getRoleId());
            queue.add(role.getRoleId());
        }

        // 3. Traverse hierarchy upwards
        while (!queue.isEmpty()) {
            Long currentRoleId = queue.poll();
            Optional<Role> roleOpt = roleRepository.findById(currentRoleId);
            if (roleOpt.isPresent()) {
                Long parentId = roleOpt.get().getParentRoleId();
                if (parentId != null && !allRoleIds.contains(parentId)) {
                    allRoleIds.add(parentId);
                    queue.add(parentId);
                }
            }
        }

        if (allRoleIds.isEmpty()) {
            return Collections.emptyList();
        }

        // 4. Fetch permissions for all direct and inherited roles
        return permissionRepository.findPermissionsByRoleIds(new ArrayList<>(allRoleIds));
    }

    @Transactional(readOnly = true)
    public Optional<User> getUserById(Long userId) {
        return userRepository.findById(userId);
    }

    @Transactional(readOnly = true)
    public Page<User> listEmployees(int page, int size, String search, String role, String status, String sort) {
        Sort sortObj = Sort.unsorted();
        if (sort != null && sort.contains(",")) {
            String[] parts = sort.split(",");
            String property = parts[0];
            String direction = parts[1];
            sortObj = Sort.by(Sort.Direction.fromString(direction), property);
        }
        Pageable pageable = PageRequest.of(page, size, sortObj);

        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                Predicate employeeIdMatch = cb.like(cb.lower(root.get("employeeId")), searchPattern);
                Predicate displayNameMatch = cb.like(cb.lower(root.get("displayName")), searchPattern);
                Predicate emailMatch = cb.like(cb.lower(root.get("email")), searchPattern);
                predicates.add(cb.or(employeeIdMatch, displayNameMatch, emailMatch));
            }

            if (status != null && !status.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status.trim()));
            }

            if (role != null && !role.trim().isEmpty()) {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<UserRole> urRoot = subquery.from(UserRole.class);
                Root<Role> rRoot = subquery.from(Role.class);

                subquery.select(urRoot.get("userId"))
                        .where(
                                cb.equal(urRoot.get("roleId"), rRoot.get("roleId")),
                                cb.equal(cb.lower(rRoot.get("roleName")), role.trim().toLowerCase())
                        );

                predicates.add(root.get("userId").in(subquery));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return userRepository.findAll(spec, pageable);
    }

    @Transactional
    public void activateUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        // Check if user holds ROLE_ADMIN
        boolean isAdmin = roleRepository.findRolesByUserId(userId).stream()
                .anyMatch(role -> "ROLE_ADMIN".equalsIgnoreCase(role.getRoleName()));
        if (isAdmin) {
            throw new IllegalArgumentException("Action not allowed on admin users");
        }

        user.setStatus("ACTIVE");
        userRepository.save(user);
    }

    @Transactional
    public void deactivateUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        // Check if user holds ROLE_ADMIN
        boolean isAdmin = roleRepository.findRolesByUserId(userId).stream()
                .anyMatch(role -> "ROLE_ADMIN".equalsIgnoreCase(role.getRoleName()));
        if (isAdmin) {
            throw new IllegalArgumentException("Action not allowed on admin users");
        }

        user.setStatus("INACTIVE");
        userRepository.save(user);
    }
}

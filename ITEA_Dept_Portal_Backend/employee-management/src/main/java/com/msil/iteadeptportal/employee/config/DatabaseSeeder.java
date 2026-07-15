package com.msil.iteadeptportal.employee.config;

import com.msil.iteadeptportal.employee.model.Permission;
import com.msil.iteadeptportal.employee.model.Role;
import com.msil.iteadeptportal.employee.model.RolePermission;
import com.msil.iteadeptportal.employee.repository.PermissionRepository;
import com.msil.iteadeptportal.employee.repository.RolePermissionRepository;
import com.msil.iteadeptportal.employee.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;

    @Override
    public void run(String... args) {
        // 1. Seed Roles with hierarchy
        Role userRole = seedRole("ROLE_USER", null);
        Role managerRole = seedRole("ROLE_MANAGER", userRole.getRoleId());
        Role adminRole = seedRole("ROLE_ADMIN", managerRole.getRoleId());

        // 2. Seed Permissions
        Permission viewAllPerm = seedPermission("EMPLOYEE_VIEW_TEAM", "Employee", "View team directory");
        Permission viewDetailsPerm = seedPermission("EMPLOYEE_VIEW_DETAILS", "Employee", "View employee details");
        Permission activatePerm = seedPermission("USER_ACTIVATE", "Employee", "Activate portal user");
        Permission deactivatePerm = seedPermission("USER_DEACTIVATE", "Employee", "Deactivate portal user");

        // 3. Map Permission to Role
        seedRolePermission(adminRole.getRoleId(), viewAllPerm.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), viewDetailsPerm.getPermissionId());
        seedRolePermission(adminRole.getRoleId(), activatePerm.getPermissionId());
        seedRolePermission(adminRole.getRoleId(), deactivatePerm.getPermissionId());
    }

    private Role seedRole(String name, Long parentId) {
        return roleRepository.findByRoleName(name)
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .roleName(name)
                        .parentRoleId(parentId)
                        .build()));
    }

    private Permission seedPermission(String name, String module, String desc) {
        return permissionRepository.findAll().stream()
                .filter(p -> p.getPermissionName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> permissionRepository.save(Permission.builder()
                        .permissionName(name)
                        .moduleName(module)
                        .description(desc)
                        .build()));
    }

    private void seedRolePermission(Long roleId, Long permissionId) {
        boolean exists = rolePermissionRepository.findAll().stream()
                .anyMatch(rp -> rp.getRoleId().equals(roleId) && rp.getPermissionId().equals(permissionId));
        if (!exists) {
            rolePermissionRepository.save(RolePermission.builder()
                    .roleId(roleId)
                    .permissionId(permissionId)
                    .build());
        }
    }
}

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

        // Attendance Permissions
        Permission checkInPerm = seedPermission("ATTENDANCE_CHECK_IN", "Attendance", "Employee check-in");
        Permission checkOutPerm = seedPermission("ATTENDANCE_CHECK_OUT", "Attendance", "Employee check-out");
        Permission viewSelfPerm = seedPermission("ATTENDANCE_VIEW_SELF", "Attendance", "View own attendance status");
        Permission viewHistoryPerm = seedPermission("ATTENDANCE_HISTORY_VIEW", "Attendance", "View own attendance history");
        Permission viewTeamPerm = seedPermission("ATTENDANCE_VIEW_TEAM", "Attendance", "View team attendance status");
        Permission reportViewPerm = seedPermission("ATTENDANCE_REPORT_VIEW", "Attendance", "View attendance reports");

        // Leave & WFH Permissions
        Permission leaveViewSelfPerm = seedPermission("LEAVE_VIEW_SELF", "Leave", "View own leave request and balance");
        Permission leaveCreatePerm = seedPermission("LEAVE_CREATE", "Leave", "Apply for leave");
        Permission leaveApprovePerm = seedPermission("LEAVE_APPROVE", "Leave", "Approve leave requests");
        Permission leaveRejectPerm = seedPermission("LEAVE_REJECT", "Leave", "Reject leave requests");
        Permission wfhCreatePerm = seedPermission("WFH_CREATE", "WFH", "Apply for WFH");
        Permission wfhApprovePerm = seedPermission("WFH_APPROVE", "WFH", "Approve WFH requests");

        // 3. Map Permission to Role
        seedRolePermission(adminRole.getRoleId(), viewAllPerm.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), viewDetailsPerm.getPermissionId());
        seedRolePermission(adminRole.getRoleId(), activatePerm.getPermissionId());
        seedRolePermission(adminRole.getRoleId(), deactivatePerm.getPermissionId());

        // Map Attendance to ROLE_USER (which propagates to ROLE_MANAGER and ROLE_ADMIN)
        seedRolePermission(userRole.getRoleId(), checkInPerm.getPermissionId());
        seedRolePermission(userRole.getRoleId(), checkOutPerm.getPermissionId());
        seedRolePermission(userRole.getRoleId(), viewSelfPerm.getPermissionId());
        seedRolePermission(userRole.getRoleId(), viewHistoryPerm.getPermissionId());
        seedRolePermission(userRole.getRoleId(), leaveViewSelfPerm.getPermissionId());
        seedRolePermission(userRole.getRoleId(), leaveCreatePerm.getPermissionId());
        seedRolePermission(userRole.getRoleId(), wfhCreatePerm.getPermissionId());

        // Map Attendance to ROLE_MANAGER (which propagates to ROLE_ADMIN)
        seedRolePermission(managerRole.getRoleId(), viewTeamPerm.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), reportViewPerm.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), leaveApprovePerm.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), leaveRejectPerm.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), wfhApprovePerm.getPermissionId());
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

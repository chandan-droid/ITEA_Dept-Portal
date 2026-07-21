package com.msil.iteadeptportal.employee.config;

import com.msil.iteadeptportal.employee.model.Permission;
import com.msil.iteadeptportal.employee.model.Role;
import com.msil.iteadeptportal.employee.model.RolePermission;
import com.msil.iteadeptportal.employee.repository.PermissionRepository;
import com.msil.iteadeptportal.employee.repository.RolePermissionRepository;
import com.msil.iteadeptportal.employee.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE tasks ALTER COLUMN progress DROP NOT NULL;");
        } catch (Exception ignored) {}

        try {
            jdbcTemplate.execute("ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;");
            jdbcTemplate.execute("ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('TODO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'ARCHIVED'));");
        } catch (Exception ignored) {}

        try {
            jdbcTemplate.execute("ALTER TABLE task_attachments ALTER COLUMN storage_path DROP NOT NULL;");
        } catch (Exception ignored) {}
        try {
            jdbcTemplate.execute("ALTER TABLE task_attachments ALTER COLUMN file_path DROP NOT NULL;");
        } catch (Exception ignored) {}

        // --- Notification & Announcement Tables Initialization ---
        try {
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    notification_id BIGSERIAL PRIMARY KEY,
                    recipient_user_id BIGINT NOT NULL,
                    notification_type VARCHAR(50) NOT NULL CHECK (
                        notification_type IN ('TASK', 'PROJECT', 'ATTENDANCE', 'LEAVE', 'WFH', 'SYSTEM', 'ANNOUNCEMENT')
                    ),
                    title VARCHAR(200) NOT NULL,
                    message TEXT NOT NULL,
                    reference_type VARCHAR(50),
                    reference_id BIGINT,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    read_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_notification_user FOREIGN KEY (recipient_user_id) REFERENCES users(user_id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_notification_user_1 ON notifications(recipient_user_id);
                CREATE INDEX IF NOT EXISTS idx_notification_read_1 ON notifications(is_read);
                CREATE INDEX IF NOT EXISTS idx_notification_created_1 ON notifications(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_notification_reference_1 ON notifications(reference_type, reference_id);
            """);
        } catch (Exception e) {
            log.warn("Notifications table setup: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS announcements (
                    announcement_id BIGSERIAL PRIMARY KEY,
                    title VARCHAR(200) NOT NULL,
                    message TEXT NOT NULL,
                    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
                    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED')),
                    publish_from TIMESTAMP,
                    publish_until TIMESTAMP,
                    created_by BIGINT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    published_at TIMESTAMP,
                    archived_at TIMESTAMP,
                    CONSTRAINT fk_announcement_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
                );
            """);
        } catch (Exception e) {
            log.warn("Announcements table setup: {}", e.getMessage());
        }

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
        Permission viewHistoryPerm = seedPermission("ATTENDANCE_HISTORY_VIEW", "Attendance",
                "View own attendance history");
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

        // --- Projects Permissions ---
        Permission projCreate = seedPermission("PROJECT_CREATE", "Project", "Create project");
        Permission projViewAssigned = seedPermission("PROJECT_VIEW_ASSIGNED", "Project", "View assigned projects");
        Permission projViewTeam = seedPermission("PROJECT_VIEW_TEAM", "Project", "View team projects");
        Permission projUpdate = seedPermission("PROJECT_UPDATE", "Project", "Update project details");
        Permission projDelete = seedPermission("PROJECT_DELETE", "Project", "Delete project");
        Permission projChangeStatus = seedPermission("PROJECT_CHANGE_STATUS", "Project", "Change project status");
        Permission projArchive = seedPermission("PROJECT_ARCHIVE", "Project", "Archive project");
        Permission projAssignMgr = seedPermission("PROJECT_ASSIGN_MANAGER", "Project", "Assign project manager");
        Permission projManageMembers = seedPermission("PROJECT_MANAGE_MEMBERS", "Project", "Manage project members");
        Permission projDocUpload = seedPermission("PROJECT_DOCUMENT_UPLOAD", "Project", "Upload project documents");
        Permission projDocDelete = seedPermission("PROJECT_DOCUMENT_DELETE", "Project", "Delete project documents");
        Permission projCommentCreate = seedPermission("PROJECT_COMMENT_CREATE", "Project", "Create project comment");
        Permission projCommentDelete = seedPermission("PROJECT_COMMENT_DELETE", "Project", "Delete project comment");
        Permission projActivityView = seedPermission("PROJECT_ACTIVITY_VIEW", "Project", "View project activities");
        Permission projReportView = seedPermission("PROJECT_REPORT_VIEW", "Project", "View project reports");
        Permission projReportExport = seedPermission("PROJECT_REPORT_EXPORT", "Project", "Export project reports");

        // Map projects to roles
        seedRolePermission(userRole.getRoleId(), projViewAssigned.getPermissionId());
        seedRolePermission(userRole.getRoleId(), projDocUpload.getPermissionId());
        seedRolePermission(userRole.getRoleId(), projDocDelete.getPermissionId());
        seedRolePermission(userRole.getRoleId(), projCommentCreate.getPermissionId());
        seedRolePermission(userRole.getRoleId(), projCommentDelete.getPermissionId());

        seedRolePermission(managerRole.getRoleId(), projViewTeam.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), projCreate.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), projUpdate.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), projChangeStatus.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), projArchive.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), projAssignMgr.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), projManageMembers.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), projActivityView.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), projReportView.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), projReportExport.getPermissionId());

        seedRolePermission(adminRole.getRoleId(), projDelete.getPermissionId());

        // --- Tasks Permissions ---
        Permission taskCreate = seedPermission("TASK_CREATE", "Task", "Create new task");
        Permission taskViewSelf = seedPermission("TASK_VIEW_SELF", "Task", "View own assigned tasks");
        Permission taskViewTeam = seedPermission("TASK_VIEW_TEAM", "Task", "View team tasks");
        Permission taskUpdate = seedPermission("TASK_UPDATE", "Task", "Update task details");
        Permission taskUpdateProgress = seedPermission("TASK_UPDATE_PROGRESS", "Task",
                "Update task progress/checklist");
        Permission taskDelete = seedPermission("TASK_DELETE", "Task", "Delete task");
        Permission taskDeleteAny = seedPermission("TASK_DELETE_ANY", "Task", "Force delete any task");
        Permission taskArchive = seedPermission("TASK_ARCHIVE", "Task", "Archive task");
        Permission taskApprove = seedPermission("TASK_APPROVE", "Task", "Approve completed task");
        Permission taskAssign = seedPermission("TASK_ASSIGN", "Task", "Assign task to employees");
        Permission taskComment = seedPermission("TASK_COMMENT", "Task", "Add or delete comments");
        Permission taskAttachUpload = seedPermission("TASK_ATTACHMENT_UPLOAD", "Task", "Upload task attachments");
        Permission taskAttachDelete = seedPermission("TASK_ATTACHMENT_DELETE", "Task", "Delete task attachments");
        Permission taskActivityView = seedPermission("TASK_ACTIVITY_VIEW", "Task", "View task activity logs");
        Permission taskReportView = seedPermission("TASK_REPORT_VIEW", "Task", "View task reports");

        // Map tasks to roles
        seedRolePermission(userRole.getRoleId(), taskViewSelf.getPermissionId());
        seedRolePermission(userRole.getRoleId(), taskUpdateProgress.getPermissionId());
        seedRolePermission(userRole.getRoleId(), taskComment.getPermissionId());
        seedRolePermission(userRole.getRoleId(), taskAttachUpload.getPermissionId());

        seedRolePermission(managerRole.getRoleId(), taskViewTeam.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), taskCreate.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), taskUpdate.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), taskDelete.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), taskArchive.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), taskApprove.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), taskAssign.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), taskAttachDelete.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), taskActivityView.getPermissionId());
        seedRolePermission(managerRole.getRoleId(), taskReportView.getPermissionId());

        seedRolePermission(adminRole.getRoleId(), taskDeleteAny.getPermissionId());

        // --- Notification & Announcement Permissions ---
        Permission notifView = seedPermission("NOTIFICATION_VIEW", "Notification", "View user notifications");
        Permission notifMarkRead = seedPermission("NOTIFICATION_MARK_READ", "Notification", "Mark notification as read");
        Permission notifDelete = seedPermission("NOTIFICATION_DELETE", "Notification", "Delete notification");
        Permission annView = seedPermission("ANNOUNCEMENT_VIEW", "Announcement", "View system announcements");

        Permission annCreate = seedPermission("ANNOUNCEMENT_CREATE", "Announcement", "Create draft announcement");
        Permission annUpdate = seedPermission("ANNOUNCEMENT_UPDATE", "Announcement", "Update draft announcement");
        Permission annPublish = seedPermission("ANNOUNCEMENT_PUBLISH", "Announcement", "Publish or schedule announcement");
        Permission annArchive = seedPermission("ANNOUNCEMENT_ARCHIVE", "Announcement", "Archive announcement");
        Permission annDelete = seedPermission("ANNOUNCEMENT_DELETE", "Announcement", "Delete announcement");

        // Map to ROLE_USER (propagates to ROLE_MANAGER and ROLE_ADMIN)
        seedRolePermission(userRole.getRoleId(), notifView.getPermissionId());
        seedRolePermission(userRole.getRoleId(), notifMarkRead.getPermissionId());
        seedRolePermission(userRole.getRoleId(), notifDelete.getPermissionId());
        seedRolePermission(userRole.getRoleId(), annView.getPermissionId());

        // Map Administrator permissions to ROLE_ADMIN
        seedRolePermission(adminRole.getRoleId(), annCreate.getPermissionId());
        seedRolePermission(adminRole.getRoleId(), annUpdate.getPermissionId());
        seedRolePermission(adminRole.getRoleId(), annPublish.getPermissionId());
        seedRolePermission(adminRole.getRoleId(), annArchive.getPermissionId());
        seedRolePermission(adminRole.getRoleId(), annDelete.getPermissionId());
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

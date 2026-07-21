package com.msil.iteadeptportal.tasks.controller;

import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.tasks.api.*;
import com.msil.iteadeptportal.tasks.service.TaskService;
import com.msil.iteadeptportal.shared.api.ApiResponse;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final UserFacade  userFacade;

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Long resolveUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userFacade.getUserBySamAccountName(username)
                .map(UserDTO::getUserId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + username));
    }

    /** Returns true if the current user holds TASK_VIEW_TEAM (manager/admin). */
    private boolean isManagerOrAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("TASK_VIEW_TEAM") || a.equals("TASK_DELETE_ANY"));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── CORE TASK ENDPOINTS ─────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── POST /api/tasks — Create Task ───────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAuthority('TASK_CREATE')")
    public ResponseEntity<ApiResponse<TaskDTO>> createTask(@RequestBody CreateTaskRequest request) {
        Long userId = resolveUserId();
        TaskDTO response = taskService.createTask(request, userId);
        return new ResponseEntity<>(ApiResponse.success(response, "Task created successfully."), HttpStatus.CREATED);
    }

    // ─── GET /api/tasks/my — My Assigned Tasks ────────────────────────────────
    @GetMapping("/my")
    @PreAuthorize("hasAuthority('TASK_VIEW_SELF')")
    public ResponseEntity<ApiResponse<PaginatedResponse<TaskDTO>>> getMyTasks(
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "10")  int size,
            @RequestParam(required = false)     String search,
            @RequestParam(required = false)     String status,
            @RequestParam(required = false)     String priority,
            @RequestParam(required = false)     String category,
            @RequestParam(required = false)     Long projectId,
            @RequestParam(required = false)     @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDate,
            @RequestParam(required = false)     Boolean archived,
            @RequestParam(required = false)     Boolean overdue,
            @RequestParam(defaultValue = "taskId")  String sortBy,
            @RequestParam(defaultValue = "DESC")    String sortDirection) {

        Long userId = resolveUserId();
        PaginatedResponse<TaskDTO> response = taskService.getMyTasks(
                userId, status, priority, category, projectId, search,
                dueDate, archived, overdue, page, size, sortBy, sortDirection);
        return ResponseEntity.ok(ApiResponse.success(response, "Your tasks retrieved successfully."));
    }

    // ─── GET /api/tasks — Team Tasks (search & filter) ───────────────────────
    @GetMapping
    @PreAuthorize("hasAuthority('TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<PaginatedResponse<TaskDTO>>> getTeamTasks(
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "10")  int size,
            @RequestParam(required = false)     String search,
            @RequestParam(required = false)     String status,
            @RequestParam(required = false)     String priority,
            @RequestParam(required = false)     String category,
            @RequestParam(required = false)     Long projectId,
            @RequestParam(required = false)     Long assigneeId,
            @RequestParam(required = false)     Long createdBy,
            @RequestParam(required = false)     @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)     @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDate,
            @RequestParam(required = false)     Boolean archived,
            @RequestParam(required = false)     Boolean overdue,
            @RequestParam(defaultValue = "taskId")  String sortBy,
            @RequestParam(defaultValue = "DESC")    String sortDirection) {

        PaginatedResponse<TaskDTO> response = taskService.getTeamTasks(
                search, status, priority, category, projectId, assigneeId, createdBy,
                startDate, dueDate, archived, overdue, page, size, sortBy, sortDirection);
        return ResponseEntity.ok(ApiResponse.success(response, "Team tasks retrieved successfully."));
    }

    // ─── GET /api/tasks/{taskId} — Task Details ───────────────────────────────
    @GetMapping("/{taskId}")
    @PreAuthorize("hasAnyAuthority('TASK_VIEW_SELF', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<TaskDetailsDTO>> getTaskDetails(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        TaskDetailsDTO response = taskService.getTaskDetails(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(response, "Task details retrieved."));
    }

    // ─── PUT /api/tasks/{taskId} — Update Task ────────────────────────────────
    @PutMapping("/{taskId}")
    @PreAuthorize("hasAuthority('TASK_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> updateTask(
            @PathVariable Long taskId,
            @RequestBody UpdateTaskRequest request) {

        Long userId = resolveUserId();
        taskService.updateTask(taskId, request, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Task updated successfully."));
    }

    // ─── PATCH /api/tasks/{taskId}/progress — Update Progress ─────────────────
    @PatchMapping("/{taskId}/progress")
    @PreAuthorize("hasAuthority('TASK_UPDATE_PROGRESS')")
    public ResponseEntity<ApiResponse<Void>> updateProgress(
            @PathVariable Long taskId,
            @RequestBody Map<String, Integer> body) {

        Integer progress = body.get("progress");
        if (progress == null) {
            throw new com.msil.iteadeptportal.shared.api.BadRequestException("'progress' field is required.");
        }
        Long userId = resolveUserId();
        taskService.updateProgress(taskId, progress, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Task progress updated to " + progress + "%."));
    }

    // ─── PATCH /api/tasks/{taskId}/status — Update Status ────────────────────
    @PatchMapping("/{taskId}/status")
    @PreAuthorize("hasAnyAuthority('TASK_UPDATE', 'TASK_UPDATE_PROGRESS', 'TASK_VIEW_SELF', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<Void>> updateStatus(
            @PathVariable Long taskId,
            @RequestBody Map<String, String> body) {

        String status = body.get("status");
        if (status == null || status.isBlank()) {
            throw new com.msil.iteadeptportal.shared.api.BadRequestException("'status' field is required.");
        }
        Long userId = resolveUserId();
        taskService.updateStatus(taskId, status.toUpperCase(), userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(null, "Task status updated to " + status + "."));
    }

    // ─── DELETE /api/tasks/{taskId} — Delete Managed Task ────────────────────
    @DeleteMapping("/{taskId}")
    @PreAuthorize("hasAuthority('TASK_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        taskService.deleteTask(taskId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Task deleted successfully."));
    }

    // ─── DELETE /api/tasks/{taskId}/force — Force Delete Any Task ────────────
    @DeleteMapping("/{taskId}/force")
    @PreAuthorize("hasAuthority('TASK_DELETE_ANY')")
    public ResponseEntity<ApiResponse<Void>> forceDeleteTask(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        taskService.forceDeleteTask(taskId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Task force-deleted successfully."));
    }

    // ─── PATCH /api/tasks/{taskId}/start — Start Work ────────────────────────
    @PatchMapping("/{taskId}/start")
    @PreAuthorize("hasAnyAuthority('TASK_UPDATE_PROGRESS', 'TASK_UPDATE', 'TASK_VIEW_SELF', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<Void>> startWork(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        taskService.startWork(taskId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Work started on task."));
    }

    // ─── PATCH /api/tasks/{taskId}/submit-review — Submit For Review ──────────
    @PatchMapping("/{taskId}/submit-review")
    @PreAuthorize("hasAnyAuthority('TASK_UPDATE_PROGRESS', 'TASK_UPDATE', 'TASK_VIEW_SELF', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<Void>> submitReview(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        taskService.submitReview(taskId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Task submitted for review."));
    }

    // ─── PATCH /api/tasks/{taskId}/hold — Put On Hold ─────────────────────────
    @PatchMapping("/{taskId}/hold")
    @PreAuthorize("hasAnyAuthority('TASK_UPDATE', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<Void>> putOnHold(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        taskService.putOnHold(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(null, "Task put on hold."));
    }

    // ─── PATCH /api/tasks/{taskId}/resume — Resume Task ──────────────────────
    @PatchMapping("/{taskId}/resume")
    @PreAuthorize("hasAnyAuthority('TASK_UPDATE', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<Void>> resumeTask(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        taskService.resumeTask(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(null, "Task resumed to IN_PROGRESS."));
    }

    // ─── PATCH /api/tasks/{taskId}/approve — Approve Task Completion ─────────
    @PatchMapping("/{taskId}/approve")
    @PreAuthorize("hasAnyAuthority('TASK_APPROVE', 'TASK_UPDATE', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<Void>> approveTask(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        taskService.approveTask(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(null, "Task approved and marked completed."));
    }

    // ─── PATCH /api/tasks/{taskId}/request-changes — Request Changes ─────────
    @PatchMapping("/{taskId}/request-changes")
    @PreAuthorize("hasAnyAuthority('TASK_APPROVE', 'TASK_UPDATE', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<Void>> requestChanges(
            @PathVariable Long taskId,
            @RequestBody(required = false) Map<String, String> body) {
        String reviewComments = body != null ? body.get("reviewComments") : null;
        Long userId = resolveUserId();
        taskService.requestChanges(taskId, reviewComments, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(null, "Changes requested on task. Task returned to IN_PROGRESS."));
    }

    // ─── PATCH /api/tasks/{taskId}/cancel — Cancel Task ──────────────────────
    @PatchMapping("/{taskId}/cancel")
    @PreAuthorize("hasAnyAuthority('TASK_UPDATE', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<Void>> cancelTask(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        taskService.cancelTask(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(null, "Task cancelled successfully."));
    }

    // ─── PATCH /api/tasks/{taskId}/archive — Archive Task ────────────────────
    @PatchMapping("/{taskId}/archive")
    @PreAuthorize("hasAnyAuthority('TASK_ARCHIVE', 'TASK_UPDATE', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<Void>> archiveTask(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        taskService.archiveTask(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(null, "Task archived successfully."));
    }

    // ─── PATCH /api/tasks/{taskId}/reopen — Reopen Cancelled Task ────────────
    @PatchMapping("/{taskId}/reopen")
    @PreAuthorize("hasAnyAuthority('TASK_UPDATE', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<Void>> reopenTask(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        taskService.reopenTask(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(null, "Task reopened successfully."));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── ASSIGNEE ENDPOINTS ───────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── GET /api/tasks/{taskId}/assignees ───────────────────────────────────
    @GetMapping("/{taskId}/assignees")
    @PreAuthorize("hasAnyAuthority('TASK_VIEW_SELF', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<List<TaskAssigneeDTO>>> getAssignees(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        List<TaskAssigneeDTO> response = taskService.getAssignees(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(response, "Task assignees retrieved."));
    }

    // ─── POST /api/tasks/{taskId}/assignees ──────────────────────────────────
    @PostMapping("/{taskId}/assignees")
    @PreAuthorize("hasAuthority('TASK_ASSIGN')")
    public ResponseEntity<ApiResponse<Void>> assignUsers(
            @PathVariable Long taskId,
            @RequestBody AssignTaskRequest request) {

        Long userId = resolveUserId();
        taskService.assignUsers(taskId, request.getUserIds(), userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Users assigned successfully."));
    }

    // ─── DELETE /api/tasks/{taskId}/assignees/{userId} ───────────────────────
    @DeleteMapping("/{taskId}/assignees/{targetUserId}")
    @PreAuthorize("hasAuthority('TASK_ASSIGN')")
    public ResponseEntity<ApiResponse<Void>> removeAssignee(
            @PathVariable Long taskId,
            @PathVariable Long targetUserId) {

        Long currentUserId = resolveUserId();
        taskService.removeAssignee(taskId, targetUserId, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(null, "Assignee removed successfully."));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── COMMENT ENDPOINTS ────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── GET /api/tasks/{taskId}/comments ────────────────────────────────────
    @GetMapping("/{taskId}/comments")
    @PreAuthorize("hasAnyAuthority('TASK_VIEW_SELF', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<List<TaskCommentDTO>>> getComments(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        List<TaskCommentDTO> response = taskService.getComments(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(response, "Comments retrieved."));
    }

    // ─── POST /api/tasks/{taskId}/comments ───────────────────────────────────
    @PostMapping("/{taskId}/comments")
    @PreAuthorize("hasAuthority('TASK_COMMENT')")
    public ResponseEntity<ApiResponse<TaskCommentDTO>> addComment(
            @PathVariable Long taskId,
            @RequestBody Map<String, String> body) {

        String comment = body.get("comment");
        Long userId    = resolveUserId();
        TaskCommentDTO response = taskService.addComment(taskId, comment, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(response, "Comment added successfully."));
    }

    // ─── DELETE /api/tasks/{taskId}/comments/{commentId} ─────────────────────
    @DeleteMapping("/{taskId}/comments/{commentId}")
    @PreAuthorize("hasAuthority('TASK_COMMENT')")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long taskId,
            @PathVariable Long commentId) {

        Long userId = resolveUserId();
        taskService.deleteComment(taskId, commentId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(null, "Comment deleted successfully."));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── CHECKLIST ENDPOINTS ──────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── GET /api/tasks/{taskId}/checklist ───────────────────────────────────
    @GetMapping("/{taskId}/checklist")
    @PreAuthorize("hasAnyAuthority('TASK_VIEW_SELF', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<List<TaskChecklistItemDTO>>> getChecklist(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        List<TaskChecklistItemDTO> response = taskService.getChecklist(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(response, "Checklist retrieved."));
    }

    // ─── POST /api/tasks/{taskId}/checklist ──────────────────────────────────
    @PostMapping("/{taskId}/checklist")
    @PreAuthorize("hasAuthority('TASK_UPDATE')")
    public ResponseEntity<ApiResponse<TaskChecklistItemDTO>> addChecklistItem(
            @PathVariable Long taskId,
            @RequestBody Map<String, String> body) {

        String title = body.get("title");
        Long userId  = resolveUserId();
        TaskChecklistItemDTO response = taskService.addChecklistItem(taskId, title, userId);
        return new ResponseEntity<>(ApiResponse.success(response, "Checklist item added."), HttpStatus.CREATED);
    }

    // ─── PUT /api/tasks/{taskId}/checklist/{itemId} ───────────────────────────
    @PutMapping("/{taskId}/checklist/{itemId}")
    @PreAuthorize("hasAuthority('TASK_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> updateChecklistItem(
            @PathVariable Long taskId,
            @PathVariable Long itemId,
            @RequestBody Map<String, String> body) {

        String title = body.get("title");
        Long userId  = resolveUserId();
        taskService.updateChecklistItem(taskId, itemId, title, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Checklist item updated."));
    }

    // ─── PATCH /api/tasks/{taskId}/checklist/{itemId} — Mark complete ─────────
    @PatchMapping("/{taskId}/checklist/{itemId}")
    @PreAuthorize("hasAuthority('TASK_UPDATE_PROGRESS')")
    public ResponseEntity<ApiResponse<Void>> markChecklistItem(
            @PathVariable Long taskId,
            @PathVariable Long itemId,
            @RequestBody Map<String, Boolean> body) {

        Boolean completed = body.get("completed");
        if (completed == null) {
            throw new com.msil.iteadeptportal.shared.api.BadRequestException("'completed' field is required.");
        }
        Long userId = resolveUserId();
        taskService.markChecklistItem(taskId, itemId, completed, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Checklist item " + (completed ? "completed." : "uncompleted.")));
    }

    // ─── DELETE /api/tasks/{taskId}/checklist/{itemId} ────────────────────────
    @DeleteMapping("/{taskId}/checklist/{itemId}")
    @PreAuthorize("hasAuthority('TASK_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> deleteChecklistItem(
            @PathVariable Long taskId,
            @PathVariable Long itemId) {

        Long userId = resolveUserId();
        taskService.deleteChecklistItem(taskId, itemId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Checklist item deleted."));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── ATTACHMENT ENDPOINTS ─────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── GET /api/tasks/{taskId}/attachments ─────────────────────────────────
    @GetMapping("/{taskId}/attachments")
    @PreAuthorize("hasAnyAuthority('TASK_VIEW_SELF', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<List<TaskAttachmentDTO>>> listAttachments(@PathVariable Long taskId) {
        Long userId = resolveUserId();
        List<TaskAttachmentDTO> response = taskService.listAttachments(taskId, userId, isManagerOrAdmin());
        return ResponseEntity.ok(ApiResponse.success(response, "Attachments retrieved."));
    }

    // ─── POST /api/tasks/{taskId}/attachments ────────────────────────────────
    @PostMapping(value = "/{taskId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('TASK_ATTACHMENT_UPLOAD')")
    public ResponseEntity<ApiResponse<TaskAttachmentDTO>> uploadAttachment(
            @PathVariable Long taskId,
            @RequestParam("file") MultipartFile file) {

        Long userId = resolveUserId();
        TaskAttachmentDTO response = taskService.uploadAttachment(taskId, file, userId, isManagerOrAdmin());
        return new ResponseEntity<>(ApiResponse.success(response, "Attachment uploaded successfully."), HttpStatus.CREATED);
    }

    // ─── GET /api/tasks/{taskId}/attachments/{attachmentId} — Download ────────
    @GetMapping("/{taskId}/attachments/{attachmentId}")
    @PreAuthorize("hasAnyAuthority('TASK_VIEW_SELF', 'TASK_VIEW_TEAM')")
    public ResponseEntity<InputStreamResource> downloadAttachment(
            @PathVariable Long taskId,
            @PathVariable Long attachmentId) {

        Long userId = resolveUserId();
        InputStream is = taskService.downloadAttachment(taskId, attachmentId, userId, isManagerOrAdmin());

        // Retrieve filename for Content-Disposition header
        String filename = "attachment";
        try {
            List<TaskAttachmentDTO> atts = taskService.listAttachments(taskId, userId, isManagerOrAdmin());
            filename = atts.stream()
                    .filter(a -> a.getAttachmentId().equals(attachmentId))
                    .map(TaskAttachmentDTO::getFileName)
                    .findFirst()
                    .orElse("attachment");
        } catch (Exception ignored) { /* fallback */ }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(is));
    }

    // ─── DELETE /api/tasks/{taskId}/attachments/{attachmentId} ───────────────
    @DeleteMapping("/{taskId}/attachments/{attachmentId}")
    @PreAuthorize("hasAuthority('TASK_ATTACHMENT_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteAttachment(
            @PathVariable Long taskId,
            @PathVariable Long attachmentId) {

        Long userId = resolveUserId();
        taskService.deleteAttachment(taskId, attachmentId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Attachment deleted successfully."));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ─── REPORTING & ACTIVITY ENDPOINTS ──────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── GET /api/tasks/activity ─────────────────────────────────────────────
    @GetMapping("/activity")
    @PreAuthorize("hasAnyAuthority('TASK_VIEW_SELF', 'TASK_VIEW_TEAM', 'TASK_ACTIVITY_VIEW')")
    public ResponseEntity<ApiResponse<PaginatedResponse<TaskActivityDTO>>> getActivityLog(
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String activityType,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        PaginatedResponse<TaskActivityDTO> response =
                taskService.getActivityLog(taskId, userId, activityType, page, size);
        return ResponseEntity.ok(ApiResponse.success(response, "Activity log retrieved."));
    }

    // ─── GET /api/tasks/reports ──────────────────────────────────────────────
    @GetMapping("/reports")
    @PreAuthorize("hasAnyAuthority('TASK_REPORT_VIEW', 'TASK_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<TaskReportDTO>> getReports() {
        TaskReportDTO response = taskService.getReports();
        return ResponseEntity.ok(ApiResponse.success(response, "Task reports retrieved."));
    }

    // ─── GET /api/tasks/dashboard ────────────────────────────────────────────
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyAuthority('TASK_VIEW_SELF', 'TASK_VIEW_TEAM', 'TASK_REPORT_VIEW', 'TASK_DASHBOARD')")
    public ResponseEntity<ApiResponse<TaskDashboardDTO>> getDashboard() {
        TaskDashboardDTO response = taskService.getDashboard();
        return ResponseEntity.ok(ApiResponse.success(response, "Task dashboard retrieved."));
    }
}

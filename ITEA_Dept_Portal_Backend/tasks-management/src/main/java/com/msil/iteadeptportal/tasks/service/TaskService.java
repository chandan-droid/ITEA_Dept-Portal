package com.msil.iteadeptportal.tasks.service;

import com.msil.iteadeptportal.employee.api.EmployeeDetailsDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.projects.repository.ProjectMemberRepository;
import com.msil.iteadeptportal.tasks.api.*;
import com.msil.iteadeptportal.tasks.model.*;
import com.msil.iteadeptportal.tasks.repository.*;
import com.msil.iteadeptportal.shared.api.BadRequestException;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import com.msil.iteadeptportal.shared.api.ResourceNotFoundException;
import com.msil.iteadeptportal.shared.event.NotificationEvent;
import com.msil.iteadeptportal.shared.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final TaskChecklistRepository taskChecklistRepository;
    private final TaskAttachmentRepository taskAttachmentRepository;
    private final TaskActivityRepository taskActivityRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserFacade userFacade;
    private final StorageService storageService;
    private final ApplicationEventPublisher eventPublisher;

    private static final String BUCKET_NAME = "task-attachments";

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€â”€ VALID STATUS TRANSITIONS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    private static final Map<String, Set<String>> VALID_TRANSITIONS = new HashMap<>();

    static {
        VALID_TRANSITIONS.put("TODO", Set.of("IN_PROGRESS", "CANCELLED"));
        VALID_TRANSITIONS.put("IN_PROGRESS", Set.of("UNDER_REVIEW", "ON_HOLD", "TODO", "COMPLETED"));
        VALID_TRANSITIONS.put("ON_HOLD", Set.of("IN_PROGRESS"));
        VALID_TRANSITIONS.put("UNDER_REVIEW", Set.of("IN_PROGRESS", "COMPLETED"));
        VALID_TRANSITIONS.put("COMPLETED", Set.of("ARCHIVED"));
        VALID_TRANSITIONS.put("CANCELLED", Collections.emptySet());
        VALID_TRANSITIONS.put("ARCHIVED", Collections.emptySet());
    }

    //Helper functions
    private String getUserDisplayName(Long userId) {
        try {
            EmployeeDetailsDTO emp = userFacade.getEmployeeDetails(userId);
            return emp.getDisplayName() != null ? emp.getDisplayName() : "User#" + userId;
        } catch (Exception e) {
            return "User#" + userId;
        }
    }

    private void logActivity(Long taskId, Long userId, String activityType,
            String oldValue, String newValue) {
        TaskActivity activity = TaskActivity.builder()
                .taskId(taskId)
                .userId(userId)
                .activityType(activityType)
                .oldValue(oldValue)
                .newValue(newValue)
                .build();
        taskActivityRepository.save(activity);
    }

    private Task requireTask(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));
    }

    private boolean isAssignee(Long taskId, Long userId) {
        return taskAssigneeRepository.existsByTaskIdAndUserId(taskId, userId);
    }

    private void validateStatusTransition(String current, String next) {
        Set<String> allowed = VALID_TRANSITIONS.getOrDefault(current, Collections.emptySet());
        if (!allowed.contains(next)) {
            throw new BadRequestException(
                    "Invalid status transition: " + current + " â†’ " + next +
                            ". Allowed: " + allowed);
        }
    }

    private TaskDTO mapToDTO(Task task) {
        String creatorName = getUserDisplayName(task.getCreatedBy());
        int assigneeCount = (int) taskAssigneeRepository.findByTaskId(task.getTaskId()).size();
        int checklistCount = (int) taskChecklistRepository.countByTaskId(task.getTaskId());
        int commentCount = (int) taskCommentRepository.countByTaskId(task.getTaskId());

        return TaskDTO.builder()
                .taskId(task.getTaskId())
                .taskCode(task.getTaskCode())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .category(task.getCategory())
                .projectId(task.getProjectId())
                .progress(task.getProgressPercentage())
                .startDate(task.getStartDate())
                .dueDate(task.getDueDate())
                .archived(task.getArchived())
                .createdBy(task.getCreatedBy())
                .creatorName(creatorName)
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .assigneeCount(assigneeCount)
                .checklistCount(checklistCount)
                .commentCount(commentCount)
                .build();
    }

    private TaskAssigneeDTO mapAssigneeToDTO(TaskAssignee assignee) {
        String displayName = getUserDisplayName(assignee.getUserId());
        String assignedByName = getUserDisplayName(assignee.getAssignedBy());
        String role = "MEMBER";
        String email = null;
        try {
            EmployeeDetailsDTO emp = userFacade.getEmployeeDetails(assignee.getUserId());
            if (emp != null) {
                email = emp.getEmail();
                if (emp.getRoles() != null && !emp.getRoles().isEmpty()) {
                    role = emp.getRoles().get(0);
                }
            }
        } catch (Exception ignored) {
            /* fallback */ }

        return TaskAssigneeDTO.builder()
                .userId(assignee.getUserId())
                .displayName(displayName)
                .email(email)
                .assignedBy(assignee.getAssignedBy())
                .assignedByName(assignedByName)
                .assignedAt(assignee.getAssignedAt())
                .role(role)
                .build();
    }

    private TaskCommentDTO mapCommentToDTO(TaskComment c) {
        return TaskCommentDTO.builder()
                .commentId(c.getCommentId())
                .taskId(c.getTaskId())
                .userId(c.getUserId())
                .displayName(getUserDisplayName(c.getUserId()))
                .comment(c.getComment())
                .createdAt(c.getCreatedAt())
                .build();
    }

    private TaskChecklistItemDTO mapChecklistToDTO(TaskChecklist item) {
        return TaskChecklistItemDTO.builder()
                .itemId(item.getChecklistId())
                .taskId(item.getTaskId())
                .title(item.getTitle())
                .completed(item.getIsCompleted())
                .completedAt(item.getCompletedAt())
                .createdAt(item.getCreatedAt())
                .build();
    }

    private TaskAttachmentDTO mapAttachmentToDTO(TaskAttachment att) {
        return TaskAttachmentDTO.builder()
                .attachmentId(att.getAttachmentId())
                .taskId(att.getTaskId())
                .fileName(att.getFileName())
                .fileType(att.getFileType())
                .uploadedBy(att.getUploadedBy())
                .uploaderName(getUserDisplayName(att.getUploadedBy()))
                .uploadedAt(att.getUploadedAt())
                .build();
    }

    private TaskActivityDTO mapActivityToDTO(TaskActivity act) {
        return TaskActivityDTO.builder()
                .activityId(act.getActivityId())
                .taskId(act.getTaskId())
                .userId(act.getUserId())
                .displayName(getUserDisplayName(act.getUserId()))
                .activityType(act.getActivityType())
                .oldValue(act.getOldValue())
                .newValue(act.getNewValue())
                .activityTime(act.getActivityTime())
                .build();
    }

    private Pageable buildPageable(int page, int size, String sortBy, String sortDir) {
        Sort sort = "ASC".equalsIgnoreCase(sortDir)
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        return PageRequest.of(page, size, sort);
    }

    // 1. CREATE TASK
   
    @Transactional
    public TaskDTO createTask(CreateTaskRequest request, Long currentUserId) {
        log.info("Creating task: '{}' by userId={}", request.getTitle(), currentUserId);

        // Validation: title required
        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new BadRequestException("Task title is required.");
        }

        // Validation: date range
        if (request.getStartDate() != null && request.getDueDate() != null) {
            if (request.getDueDate().isBefore(request.getStartDate())) {
                throw new BadRequestException("Due date must not be before the start date.");
            }
        }
 
        // Note: project existence is implicitly validated when assignees are processed.
        // Project member validation is enforced in assignSingleUser for
        // project-specific tasks.

        // Temporary code to satisfy NOT NULL; real code set after auto-increment ID
        String tempCode = "TSK-TEMP-" + UUID.randomUUID().toString().substring(0, 8);

        Task task = Task.builder()
                .taskCode(tempCode)
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .status("TODO")
                .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                .category(request.getCategory())
                .projectId(request.getProjectId())
                .progressPercentage(0)
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .archived(false)
                .createdBy(currentUserId)
                .build();

        task = taskRepository.save(task);

        // Generate real task code: TSK-0001
        String taskCode = "TSK-" + String.format("%04d", task.getTaskId());
        task.setTaskCode(taskCode);
        task = taskRepository.save(task);

        // Log activity
        logActivity(task.getTaskId(), currentUserId, "TASK_CREATED", null,
                "Task '" + task.getTitle() + "' created with code " + taskCode);

        // Assign initial assignees if provided
        if (request.getAssigneeIds() != null && !request.getAssigneeIds().isEmpty()) {
            for (Long userId : request.getAssigneeIds()) {
                assignSingleUser(task, userId, currentUserId, true);
            }
        }

        // Publish notification to designated assignees
        publishTaskNotification(
                task,
                "New Task Assigned: " + taskCode,
                "You have been assigned to task '" + task.getTitle() + "'.",
                currentUserId
        );

        return mapToDTO(task);
    }

    // 2. GET MY TASKS
    public PaginatedResponse<TaskDTO> getMyTasks(Long currentUserId, String status, String priority,
            String category, Long projectId, String search,
            LocalDate dueDate, Boolean archived, Boolean overdue,
            int page, int size, String sortBy, String sortDir) {
        log.info("Fetching tasks for userId={}", currentUserId);

        Pageable pageable = buildPageable(page, size, sortBy, sortDir);
        Page<Task> taskPage = taskRepository.findMyTasks(
                currentUserId, status, priority, category, projectId,
                search, dueDate, archived, overdue, pageable);

        List<TaskDTO> content = taskPage.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        return PaginatedResponse.<TaskDTO>builder()
                .content(content).page(taskPage.getNumber()).size(taskPage.getSize())
                .totalElements(taskPage.getTotalElements()).totalPages(taskPage.getTotalPages())
                .build();
    }

    // 3. GET TEAM TASKS
    public PaginatedResponse<TaskDTO> getTeamTasks(String search, String status, String priority,
            String category, Long projectId, Long assigneeId,
            Long createdBy, LocalDate startDate, LocalDate dueDate,
            Boolean archived, Boolean overdue,
            int page, int size, String sortBy, String sortDir) {
        log.info("Searching team tasks - status={}, priority={}", status, priority);

        Pageable pageable = buildPageable(page, size, sortBy, sortDir);
        Page<Task> taskPage = taskRepository.searchTasks(
                search, status, priority, category, projectId,
                assigneeId, createdBy, startDate, dueDate, archived, overdue, pageable);

        List<TaskDTO> content = taskPage.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        return PaginatedResponse.<TaskDTO>builder()
                .content(content).page(taskPage.getNumber()).size(taskPage.getSize())
                .totalElements(taskPage.getTotalElements()).totalPages(taskPage.getTotalPages())
                .build();
    }

    //  4. GET TASK DETAILS
    
    public TaskDetailsDTO getTaskDetails(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);

        // RBAC: employees may only see tasks they are assigned to
        if (!isManagerOrAdmin && !isAssignee(taskId, currentUserId)) {
            throw new AccessDeniedException("You do not have permission to view this task.");
        }

        List<TaskAssigneeDTO> assignees = taskAssigneeRepository.findByTaskId(taskId).stream()
                .map(this::mapAssigneeToDTO).collect(Collectors.toList());
        List<TaskChecklistItemDTO> checklist = taskChecklistRepository.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(this::mapChecklistToDTO).collect(Collectors.toList());
        List<TaskCommentDTO> comments = taskCommentRepository.findByTaskIdOrderByCreatedAtDesc(taskId).stream()
                .map(this::mapCommentToDTO).collect(Collectors.toList());
        List<TaskAttachmentDTO> attachments = taskAttachmentRepository.findByTaskId(taskId).stream()
                .map(this::mapAttachmentToDTO).collect(Collectors.toList());

        return TaskDetailsDTO.builder()
                .taskId(task.getTaskId()).taskCode(task.getTaskCode()).title(task.getTitle())
                .description(task.getDescription()).status(task.getStatus()).priority(task.getPriority())
                .category(task.getCategory()).projectId(task.getProjectId()).progress(task.getProgressPercentage())
                .startDate(task.getStartDate()).dueDate(task.getDueDate()).archived(task.getArchived())
                .createdBy(task.getCreatedBy()).creatorName(getUserDisplayName(task.getCreatedBy()))
                .createdAt(task.getCreatedAt()).updatedAt(task.getUpdatedAt())
                .assignees(assignees).checklist(checklist).comments(comments).attachments(attachments)
                .build();
    }

    //  5. UPDATE TASK
    @Transactional
    public void updateTask(Long taskId, UpdateTaskRequest request, Long currentUserId) {
        Task task = requireTask(taskId);

        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }

        // Date range validation
        LocalDate newStart = request.getStartDate() != null ? request.getStartDate() : task.getStartDate();
        LocalDate newDue = request.getDueDate() != null ? request.getDueDate() : task.getDueDate();
        if (newStart != null && newDue != null && newDue.isBefore(newStart)) {
            throw new BadRequestException("Due date must not be before the start date.");
        }

        String oldTitle = task.getTitle();

        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            task.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null)
            task.setDescription(request.getDescription());
        if (request.getPriority() != null)
            task.setPriority(request.getPriority());
        if (request.getCategory() != null)
            task.setCategory(request.getCategory());
        if (request.getStartDate() != null)
            task.setStartDate(request.getStartDate());
        if (request.getDueDate() != null) {
            String oldDue = task.getDueDate() != null ? task.getDueDate().toString() : null;
            task.setDueDate(request.getDueDate());
            if (!Objects.equals(oldDue, request.getDueDate().toString())) {
                logActivity(taskId, currentUserId, "TASK_UPDATED",
                        "dueDate=" + oldDue, "dueDate=" + request.getDueDate());
            }
        }

        taskRepository.save(task);
        logActivity(taskId, currentUserId, "TASK_UPDATED", "title=" + oldTitle, "title=" + task.getTitle());
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€â”€ 6. UPDATE PROGRESS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    @Transactional
    public void updateProgress(Long taskId, int progress, Long currentUserId) {
        if (progress < 0 || progress > 100) {
            throw new BadRequestException("Progress must be between 0 and 100.");
        }

        Task task = requireTask(taskId);

        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }

        if (!isAssignee(taskId, currentUserId)) {
            throw new AccessDeniedException("Only assignees can update task progress.");
        }

        int oldProgress = task.getProgressPercentage();
        task.setProgressPercentage(progress);
        taskRepository.save(task);

        logActivity(taskId, currentUserId, "PROGRESS_UPDATED",
                String.valueOf(oldProgress), String.valueOf(progress));
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ──────────────────────────────────────────────────────────────────────────
    // ─── 7. UPDATE STATUS
    // ──────────────────────────────────────────────────────────────────────────
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public void updateStatus(Long taskId, String newStatus, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);

        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }

        boolean isCreator = task.getCreatedBy().equals(currentUserId);
        boolean isAssigneeUser = isAssignee(taskId, currentUserId);

        if (!isManagerOrAdmin && !isCreator && !isAssigneeUser) {
            throw new AccessDeniedException(
                    "You do not have permission to change the status of this task. You must be an assigned employee, task creator, or manager.");
        }

        validateStatusTransition(task.getStatus(), newStatus);

        String oldStatus = task.getStatus();
        task.setStatus(newStatus);
        taskRepository.save(task);

        logActivity(taskId, currentUserId, "STATUS_CHANGED", oldStatus, newStatus);
    }

    // ─── 8. DELETE TASK & STATUS MANAGEMENT ─────────────────────────────────

    @Transactional
    public void deleteTask(Long taskId, Long currentUserId) {
        Task task = requireTask(taskId);
        if (!task.getCreatedBy().equals(currentUserId)) {
            throw new AccessDeniedException("Only the creator can delete this task.");
        }
        taskRepository.delete(task);
    }

    @Transactional
    public void forceDeleteTask(Long taskId, Long currentUserId) {
        Task task = requireTask(taskId);
        taskRepository.delete(task);
    }

    @Transactional
    public void startWork(Long taskId, Long currentUserId) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        boolean isCreator = task.getCreatedBy().equals(currentUserId);
        boolean isAssigneeUser = isAssignee(taskId, currentUserId);
        if (!isCreator && !isAssigneeUser) {
            throw new AccessDeniedException("Only assigned employees or creators can start work on tasks.");
        }
        String oldStatus = task.getStatus();
        task.setStatus("IN_PROGRESS");
        taskRepository.save(task);
        logActivity(taskId, currentUserId, "STATUS_CHANGED", oldStatus, "IN_PROGRESS");
        publishTaskNotification(task, "Work Started: " + task.getTaskCode(), "Work has started on task '" + task.getTitle() + "'.");
    }

    @Transactional
    public void submitReview(Long taskId, Long currentUserId) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        if (!"IN_PROGRESS".equals(task.getStatus())) {
            throw new BadRequestException("Only tasks in IN_PROGRESS status can be submitted for review. Current status: " + task.getStatus());
        }
        boolean isCreator = task.getCreatedBy().equals(currentUserId);
        boolean isAssigneeUser = isAssignee(taskId, currentUserId);
        if (!isCreator && !isAssigneeUser) {
            throw new AccessDeniedException("Only assigned employees or task creators can submit work for review.");
        }
        task.setStatus("UNDER_REVIEW");
        taskRepository.save(task);
        logActivity(taskId, currentUserId, "STATUS_CHANGED", "IN_PROGRESS", "UNDER_REVIEW");
        publishTaskNotification(task, "Task Submitted for Review: " + task.getTaskCode(), "Task '" + task.getTitle() + "' was submitted for review.", currentUserId);
    }

    @Transactional
    public void approveTask(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        if (!"UNDER_REVIEW".equals(task.getStatus()) && !"COMPLETED".equals(task.getStatus())) {
            throw new BadRequestException("Only tasks in UNDER_REVIEW status can be approved. Current status: " + task.getStatus());
        }
        boolean isCreator = task.getCreatedBy().equals(currentUserId);
        if (!isManagerOrAdmin && !isCreator) {
            throw new AccessDeniedException("Only task creators or managers can approve task completion.");
        }
        String oldStatus = task.getStatus();
        task.setStatus("COMPLETED");
        if (task.getProgressPercentage() == null || task.getProgressPercentage() < 100) {
            task.setProgressPercentage(100);
        }
        taskRepository.save(task);
        logActivity(taskId, currentUserId, "TASK_APPROVED", oldStatus, "COMPLETED");
        publishTaskNotification(task, "Task Approved: " + task.getTaskCode(), "Task '" + task.getTitle() + "' has been approved and marked completed.", currentUserId);
    }

    @Transactional
    public void putOnHold(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        if (!"IN_PROGRESS".equals(task.getStatus())) {
            throw new BadRequestException("Only tasks in IN_PROGRESS status can be put on hold. Current status: " + task.getStatus());
        }
        boolean isCreator = task.getCreatedBy().equals(currentUserId);
        if (!isManagerOrAdmin && !isCreator) {
            throw new AccessDeniedException("Only task creators or managers can put tasks on hold.");
        }
        task.setStatus("ON_HOLD");
        taskRepository.save(task);
        logActivity(taskId, currentUserId, "STATUS_CHANGED", "IN_PROGRESS", "ON_HOLD");
        publishTaskNotification(task, "Task On Hold: " + task.getTaskCode(), "Task '" + task.getTitle() + "' has been put on hold.", currentUserId);
    }

    @Transactional
    public void resumeTask(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        if (!"ON_HOLD".equals(task.getStatus()) && !"BLOCKED".equals(task.getStatus())) {
            throw new BadRequestException("Only tasks in ON_HOLD or BLOCKED status can be resumed. Current status: " + task.getStatus());
        }
        boolean isCreator = task.getCreatedBy().equals(currentUserId);
        if (!isManagerOrAdmin && !isCreator) {
            throw new AccessDeniedException("Only task creators or managers can resume work on tasks.");
        }
        String oldStatus = task.getStatus();
        task.setStatus("IN_PROGRESS");
        taskRepository.save(task);
        logActivity(taskId, currentUserId, "STATUS_CHANGED", oldStatus, "IN_PROGRESS");
        publishTaskNotification(task, "Task Resumed: " + task.getTaskCode(), "Work has resumed on task '" + task.getTitle() + "'.", currentUserId);
    }

    @Transactional
    public void requestChanges(Long taskId, String reviewComments, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        if (!"UNDER_REVIEW".equals(task.getStatus())) {
            throw new BadRequestException("Only tasks in UNDER_REVIEW status can have changes requested. Current status: " + task.getStatus());
        }
        boolean isCreator = task.getCreatedBy().equals(currentUserId);
        if (!isManagerOrAdmin && !isCreator) {
            throw new AccessDeniedException("Only task creators or managers can request changes on submitted tasks.");
        }
        task.setStatus("IN_PROGRESS");
        taskRepository.save(task);
        logActivity(taskId, currentUserId, "CHANGES_REQUESTED", "UNDER_REVIEW", reviewComments != null ? reviewComments : "Changes requested by reviewer.");
        publishTaskNotification(task, "Changes Requested: " + task.getTaskCode(), "Changes were requested on task '" + task.getTitle() + "'.", currentUserId);

        if (reviewComments != null && !reviewComments.trim().isEmpty()) {
            addComment(taskId, "[Review Feedback]: " + reviewComments.trim(), currentUserId, isManagerOrAdmin);
        }
    }

    @Transactional
    public void cancelTask(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        if (Set.of("COMPLETED", "ARCHIVED", "CANCELLED").contains(task.getStatus())) {
            throw new BadRequestException("Completed, archived, or cancelled tasks cannot be cancelled. Current status: " + task.getStatus());
        }
        boolean isCreator = task.getCreatedBy().equals(currentUserId);
        if (!isManagerOrAdmin && !isCreator) {
            throw new AccessDeniedException("Only task creators or managers can cancel tasks.");
        }
        String oldStatus = task.getStatus();
        task.setStatus("CANCELLED");
        taskRepository.save(task);
        logActivity(taskId, currentUserId, "TASK_CANCELLED", oldStatus, "CANCELLED");
    }

    @Transactional
    public void archiveTask(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);
        if (!"COMPLETED".equals(task.getStatus())) {
            throw new BadRequestException("Only COMPLETED tasks can be archived. Current status: " + task.getStatus());
        }
        boolean isCreator = task.getCreatedBy().equals(currentUserId);
        if (!isManagerOrAdmin && !isCreator) {
            throw new AccessDeniedException("Only task creators or managers can archive completed tasks.");
        }
        if (task.getArchived()) {
            throw new BadRequestException("Task is already archived.");
        }
        task.setArchived(true);
        task.setStatus("ARCHIVED");
        taskRepository.save(task);
        logActivity(taskId, currentUserId, "TASK_ARCHIVED", "COMPLETED", "ARCHIVED");
    }

    @Transactional
    public void reopenTask(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);
        if (!"CANCELLED".equals(task.getStatus())) {
            throw new BadRequestException("Only CANCELLED tasks can be reopened. Current status: " + task.getStatus());
        }
        if (!isManagerOrAdmin) {
            throw new AccessDeniedException("Only managers or admins can reopen cancelled tasks.");
        }
        task.setArchived(false);
        task.setStatus("TODO");
        taskRepository.save(task);
        logActivity(taskId, currentUserId, "TASK_REOPENED", "CANCELLED", "TODO");
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€â”€ 12. ASSIGNEES
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    public List<TaskAssigneeDTO> getAssignees(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);
        if (!isManagerOrAdmin && !isAssignee(taskId, currentUserId)) {
            throw new AccessDeniedException("Access denied.");
        }
        return taskAssigneeRepository.findByTaskId(taskId).stream()
                .map(this::mapAssigneeToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void assignUsers(Long taskId, List<Long> userIds, Long currentUserId) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        List<Long> newlyAssigned = new ArrayList<>();
        for (Long userId : userIds) {
            if (!taskAssigneeRepository.existsByTaskIdAndUserId(taskId, userId)) {
                assignSingleUser(task, userId, currentUserId, true);
                newlyAssigned.add(userId);
            }
        }
        if (!newlyAssigned.isEmpty()) {
            newlyAssigned.remove(currentUserId);
            if (!newlyAssigned.isEmpty()) {
                eventPublisher.publishEvent(new NotificationEvent(
                        newlyAssigned,
                        "TASK",
                        "New Task Assigned: " + task.getTaskCode(),
                        "You have been assigned to task '" + task.getTitle() + "'.",
                        "TASK",
                        task.getTaskId(),
                        currentUserId
                ));
            }
        }
    }

    private void assignSingleUser(Task task, Long userId, Long currentUserId, boolean skipDuplicateCheck) {
        Long taskId = task.getTaskId();

        // Check duplicate
        if (!skipDuplicateCheck || taskAssigneeRepository.existsByTaskIdAndUserId(taskId, userId)) {
            if (taskAssigneeRepository.existsByTaskIdAndUserId(taskId, userId)) {
                throw new BadRequestException("User " + userId + " is already assigned to task " + taskId);
            }
        }

        // Validate user exists
        try {
            userFacade.getEmployeeDetails(userId);
        } catch (Exception e) {
            throw new BadRequestException("User does not exist with ID: " + userId);
        }

        // Project-specific task: assignee must be an active project member
        if (task.getProjectId() != null) {
            boolean isMember = projectMemberRepository.existsByProjectIdAndUserIdAndLeftAtIsNull(task.getProjectId(),
                    userId);
            if (!isMember) {
                throw new BadRequestException(
                        "User " + userId + " is not a member of project " + task.getProjectId() +
                                ". Project-specific tasks can only be assigned to project members.");
            }
        }

        TaskAssignee assignee = TaskAssignee.builder()
                .taskId(taskId).userId(userId).assignedBy(currentUserId)
                .build();
        taskAssigneeRepository.save(assignee);

        logActivity(taskId, currentUserId, "ASSIGNEE_ADDED",
                null, "User " + getUserDisplayName(userId) + " assigned.");
    }

    @Transactional
    public void removeAssignee(Long taskId, Long targetUserId, Long currentUserId) {
        requireTask(taskId);
        if (!taskAssigneeRepository.existsByTaskIdAndUserId(taskId, targetUserId)) {
            throw new BadRequestException("User " + targetUserId + " is not assigned to task " + taskId);
        }
        taskAssigneeRepository.deleteByTaskIdAndUserId(taskId, targetUserId);
        logActivity(taskId, currentUserId, "ASSIGNEE_REMOVED",
                "User " + getUserDisplayName(targetUserId), null);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€â”€ 13. COMMENTS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    public List<TaskCommentDTO> getComments(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        requireTask(taskId);
        if (!isManagerOrAdmin && !isAssignee(taskId, currentUserId)) {
            throw new AccessDeniedException("Access denied.");
        }
        return taskCommentRepository.findByTaskIdOrderByCreatedAtDesc(taskId).stream()
                .map(this::mapCommentToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskCommentDTO addComment(Long taskId, String commentText, Long currentUserId, boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        if (!isManagerOrAdmin && !isAssignee(taskId, currentUserId)) {
            throw new AccessDeniedException("Only task assignees or managers can comment.");
        }
        if (commentText == null || commentText.trim().isEmpty()) {
            throw new BadRequestException("Comment cannot be empty.");
        }

        TaskComment comment = TaskComment.builder()
                .taskId(taskId).userId(currentUserId).comment(commentText.trim())
                .build();
        comment = taskCommentRepository.save(comment);

        logActivity(taskId, currentUserId, "COMMENT_ADDED", null, commentText.trim());
        return mapCommentToDTO(comment);
    }

    @Transactional
    public void deleteComment(Long taskId, Long commentId, Long currentUserId, boolean isManagerOrAdmin) {
        requireTask(taskId);
        TaskComment comment = taskCommentRepository.findById(commentId).orElse(null);
        if (comment == null) {
            // Idempotent: comment was already deleted by another user
            return;
        }

        if (!comment.getTaskId().equals(taskId)) {
            throw new BadRequestException("Comment does not belong to task " + taskId);
        }

        // Employees can only delete their own comments
        if (!isManagerOrAdmin && !comment.getUserId().equals(currentUserId)) {
            throw new AccessDeniedException("You can only delete your own comments.");
        }

        taskCommentRepository.delete(comment);
        logActivity(taskId, currentUserId, "COMMENT_DELETED", comment.getComment(), null);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€â”€ 14. CHECKLIST
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    public List<TaskChecklistItemDTO> getChecklist(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        requireTask(taskId);
        if (!isManagerOrAdmin && !isAssignee(taskId, currentUserId)) {
            throw new AccessDeniedException("Access denied.");
        }
        return taskChecklistRepository.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(this::mapChecklistToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskChecklistItemDTO addChecklistItem(Long taskId, String title, Long currentUserId) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        if (title == null || title.trim().isEmpty()) {
            throw new BadRequestException("Checklist item title cannot be empty.");
        }

        TaskChecklist item = TaskChecklist.builder()
                .taskId(taskId).title(title.trim()).isCompleted(false)
                .build();
        item = taskChecklistRepository.save(item);
        logActivity(taskId, currentUserId, "CHECKLIST_ADDED", null, title.trim());
        return mapChecklistToDTO(item);
    }

    @Transactional
    public void updateChecklistItem(Long taskId, Long itemId, String title, Long currentUserId) {
        requireTask(taskId);
        TaskChecklist item = taskChecklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist item not found: " + itemId));
        if (!item.getTaskId().equals(taskId)) {
            throw new BadRequestException("Checklist item does not belong to task " + taskId);
        }
        String old = item.getTitle();
        item.setTitle(title.trim());
        taskChecklistRepository.save(item);
        logActivity(taskId, currentUserId, "CHECKLIST_UPDATED", old, title.trim());
    }

    @Transactional
    public void markChecklistItem(Long taskId, Long itemId, boolean completed, Long currentUserId) {
        requireTask(taskId);
        TaskChecklist item = taskChecklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist item not found: " + itemId));
        if (!item.getTaskId().equals(taskId)) {
            throw new BadRequestException("Checklist item does not belong to task " + taskId);
        }
        boolean wasCompleted = Boolean.TRUE.equals(item.getIsCompleted());
        item.setIsCompleted(completed);
        item.setCompletedAt(completed ? LocalDateTime.now() : null);
        taskChecklistRepository.save(item);
        logActivity(taskId, currentUserId, "CHECKLIST_COMPLETED",
                String.valueOf(wasCompleted), String.valueOf(completed));
    }

    @Transactional
    public void deleteChecklistItem(Long taskId, Long itemId, Long currentUserId) {
        requireTask(taskId);
        TaskChecklist item = taskChecklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist item not found: " + itemId));
        if (!item.getTaskId().equals(taskId)) {
            throw new BadRequestException("Checklist item does not belong to task " + taskId);
        }
        taskChecklistRepository.delete(item);
        logActivity(taskId, currentUserId, "CHECKLIST_DELETED", item.getTitle(), null);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€â”€ 15. ATTACHMENTS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    public List<TaskAttachmentDTO> listAttachments(Long taskId, Long currentUserId, boolean isManagerOrAdmin) {
        requireTask(taskId);
        if (!isManagerOrAdmin && !isAssignee(taskId, currentUserId)) {
            throw new AccessDeniedException("Access denied.");
        }
        return taskAttachmentRepository.findByTaskId(taskId).stream()
                .map(this::mapAttachmentToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskAttachmentDTO uploadAttachment(Long taskId, MultipartFile file, Long currentUserId,
            boolean isManagerOrAdmin) {
        Task task = requireTask(taskId);
        if (task.getArchived()) {
            throw new BadRequestException("Archived tasks are read-only.");
        }
        if (!isManagerOrAdmin && !isAssignee(taskId, currentUserId)) {
            throw new AccessDeniedException("Only task members can upload attachments.");
        }

        String storagePath = "task-" + taskId + "/" + UUID.randomUUID() + "-" +
                Objects.requireNonNullElse(file.getOriginalFilename(), "file");

        storageService.uploadFile(file, BUCKET_NAME, storagePath);

        TaskAttachment attachment = TaskAttachment.builder()
                .taskId(taskId)
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .storagePath(storagePath)
                .filePath(storagePath)
                .uploadedBy(currentUserId)
                .build();
        attachment = taskAttachmentRepository.save(attachment);

        logActivity(taskId, currentUserId, "ATTACHMENT_UPLOADED", null, file.getOriginalFilename());
        return mapAttachmentToDTO(attachment);
    }

    public InputStream downloadAttachment(Long taskId, Long attachmentId, Long currentUserId,
            boolean isManagerOrAdmin) {
        requireTask(taskId);
        if (!isManagerOrAdmin && !isAssignee(taskId, currentUserId)) {
            throw new AccessDeniedException("Access denied.");
        }
        TaskAttachment att = taskAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + attachmentId));
        if (!att.getTaskId().equals(taskId)) {
            throw new BadRequestException("Attachment does not belong to task " + taskId);
        }
        return storageService.downloadFile(BUCKET_NAME, att.getStoragePath());
    }

    @Transactional
    public void deleteAttachment(Long taskId, Long attachmentId, Long currentUserId) {
        requireTask(taskId);
        TaskAttachment att = taskAttachmentRepository.findById(attachmentId).orElse(null);
        if (att == null) {
            // Idempotent: attachment was already deleted by another user
            return;
        }
        if (!att.getTaskId().equals(taskId)) {
            throw new BadRequestException("Attachment does not belong to task " + taskId);
        }
        try {
            storageService.deleteFile(BUCKET_NAME, att.getStoragePath());
        } catch (Exception e) {
            log.warn("Could not delete attachment from storage: {}", e.getMessage());
        }
        taskAttachmentRepository.delete(att);
        logActivity(taskId, currentUserId, "ATTACHMENT_DELETED", att.getFileName(), null);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€â”€ 16. ACTIVITY LOG
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    public PaginatedResponse<TaskActivityDTO> getActivityLog(Long taskId, Long userId, String activityType,
            int page, int size) {
        org.springframework.data.domain.Pageable pageable = PageRequest.of(page, size,
                Sort.by("activityTime").descending());
        Page<TaskActivity> actPage = taskActivityRepository.findActivities(taskId, userId, activityType, pageable);

        List<TaskActivityDTO> content = actPage.getContent().stream()
                .map(this::mapActivityToDTO)
                .collect(Collectors.toList());

        return PaginatedResponse.<TaskActivityDTO>builder()
                .content(content).page(actPage.getNumber()).size(actPage.getSize())
                .totalElements(actPage.getTotalElements()).totalPages(actPage.getTotalPages())
                .build();
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€â”€ 17. REPORTS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    public TaskReportDTO getReports() {
        long total = taskRepository.count();
        long overdue = taskRepository.countOverdueTasks(LocalDate.now());
        long completed = taskRepository.countByStatus("COMPLETED") +
                taskRepository.countByStatus("ARCHIVED");
        double completionRate = total > 0 ? (completed * 100.0 / total) : 0.0;

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (String s : TaskStatus.getAllStatuses()) {
            byStatus.put(s, taskRepository.countByStatus(s));
        }

        Map<String, Long> byPriority = new LinkedHashMap<>();
        for (String p : List.of("LOW", "MEDIUM", "HIGH", "CRITICAL")) {
            // count via raw query is not available but we can use a derived approach
            byPriority.put(p, taskRepository.countByStatus(p)); // placeholder â€” see note
        }

        // Employee workload: userId â†’ active task count
        Map<Long, Long> workload = new LinkedHashMap<>();
        List<TaskAssignee> allAssignees = taskAssigneeRepository.findAll();
        for (TaskAssignee a : allAssignees) {
            workload.merge(a.getUserId(), 1L, Long::sum);
        }

        // Aging tasks: overdue by more than 7 days
        List<TaskDTO> aging = taskRepository.findAll().stream()
                .filter(t -> t.getDueDate() != null
                        && t.getDueDate().isBefore(LocalDate.now().minusDays(7))
                        && !Set.of("COMPLETED", "ARCHIVED", "CANCELLED").contains(t.getStatus()))
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        return TaskReportDTO.builder()
                .totalTasks(total)
                .overdueTasks(overdue)
                .completionRate(Math.round(completionRate * 10.0) / 10.0)
                .tasksByStatus(byStatus)
                .tasksByPriority(byPriority)
                .employeeWorkload(workload)
                .agingTasks(aging)
                .build();
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // â”€â”€â”€ 18. DASHBOARD
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    public TaskDashboardDTO getDashboard() {
        long total = taskRepository.count();
        long overdue = taskRepository.countOverdueTasks(LocalDate.now());
        long completed = taskRepository.countByStatus("COMPLETED") +
                taskRepository.countByStatus("ARCHIVED");
        double completionRate = total > 0 ? (completed * 100.0 / total) : 0.0;

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (String s : TaskStatus.getAllStatuses()) {
            byStatus.put(s, taskRepository.countByStatus(s));
        }

        Map<String, Long> byPriority = new LinkedHashMap<>();
        for (String p : List.of("LOW", "MEDIUM", "HIGH", "CRITICAL")) {
            byPriority.put(p, 0L); // populated via dedicated query if needed
        }

        return TaskDashboardDTO.builder()
                .totalTasks(total)
                .overdueTasks(overdue)
                .completionRate(Math.round(completionRate * 10.0) / 10.0)
                .tasksByStatus(byStatus)
                .tasksByPriority(byPriority)
                .build();
    }

    private void publishTaskNotification(Task task, String title, String message) {
        publishTaskNotification(task, title, message, null);
    }

    private void publishTaskNotification(Task task, String title, String message, Long actorUserId) {
        try {
            Set<Long> recipientIds = new HashSet<>();
            List<TaskAssignee> assignees = taskAssigneeRepository.findByTaskId(task.getTaskId());
            if (assignees != null) {
                for (TaskAssignee a : assignees) {
                    if (a.getUserId() != null) {
                        recipientIds.add(a.getUserId());
                    }
                }
            }
            if (task.getCreatedBy() != null) {
                recipientIds.add(task.getCreatedBy());
            }
            if (actorUserId != null) {
                recipientIds.remove(actorUserId);
            }
            if (!recipientIds.isEmpty()) {
                eventPublisher.publishEvent(new NotificationEvent(
                        new ArrayList<>(recipientIds),
                        "TASK",
                        title,
                        message,
                        "TASK",
                        task.getTaskId(),
                        actorUserId
                ));
            }
        } catch (Exception e) {
            log.warn("Failed to publish task notification: {}", e.getMessage());
        }
    }
}

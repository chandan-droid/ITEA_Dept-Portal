package com.msil.iteadeptportal.projects.service;

import com.msil.iteadeptportal.employee.api.EmployeeDetailsDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.projects.api.*;
import com.msil.iteadeptportal.projects.model.*;
import com.msil.iteadeptportal.projects.repository.*;
import com.msil.iteadeptportal.shared.api.BadRequestException;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import com.msil.iteadeptportal.shared.api.ResourceNotFoundException;
import com.msil.iteadeptportal.shared.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.msil.iteadeptportal.shared.event.NotificationEvent;
import org.springframework.context.ApplicationEventPublisher;

import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectMilestoneRepository projectMilestoneRepository;
    private final ProjectDocumentRepository projectDocumentRepository;
    private final ProjectCommentRepository projectCommentRepository;
    private final ProjectActivityRepository projectActivityRepository;
    private final UserFacade userFacade;
    private final StorageService storageService; 
    private final ApplicationEventPublisher eventPublisher;

    private static final String BUCKET_NAME = "project-documents";

    // ─── 1. CREATE PROJECT ───────────────────────────────────────────────────
    @Transactional
    public CreateProjectResponse createProject(CreateProjectRequest request, Long currentUserId) {
        log.info("Creating project: {} by user: {}", request.getProjectName(), currentUserId);

        // Validation 1: Project name is required
        if (request.getProjectName() == null || request.getProjectName().trim().isEmpty()) {
            throw new BadRequestException("Project name is required.");
        }

        // Validation 2: Project name should be unique
        if (projectRepository.existsByProjectName(request.getProjectName().trim())) {
            throw new BadRequestException("Project name must be unique.");
        }

        // Validation 3: End date must be greater than start date
        if (request.getPlannedStartDate() != null && request.getPlannedEndDate() != null) {
            if (request.getPlannedEndDate().isBefore(request.getPlannedStartDate())) {
                throw new BadRequestException("Planned end date must be greater than or equal to planned start date.");
            }
        }

        // Validation 4: Owner must exist
        try {
            userFacade.getEmployeeDetails(request.getOwnerId());
        } catch (Exception e) {
            throw new BadRequestException("Owner user does not exist with ID: " + request.getOwnerId());
        }

        // Generate temporary project code to satisfy database NOT NULL constraint
        String tempCode = "TEMP-" + UUID.randomUUID().toString().substring(0, 10);

        Project project = Project.builder()
                .projectCode(tempCode)
                .projectName(request.getProjectName().trim())
                .description(request.getDescription())
                .objectives(request.getObjectives())
                .ownerId(request.getOwnerId())
                .plannedStartDate(request.getPlannedStartDate())
                .plannedEndDate(request.getPlannedEndDate())
                .status("PLANNING")
                .progressPercentage(0)
                .archived(false)
                .createdBy(currentUserId)
                .build();

        // Save project first to generate the auto-increment primary key (project_id)
        project = projectRepository.save(project);

        // Generate actual project code in the format: PRJ-00XX
        String projectCode = "PRJ-" + String.format("%04d", project.getProjectId());
        project.setProjectCode(projectCode);
        project = projectRepository.save(project);

        // Business Rule: A project manager must also be a project member.
        // Therefore, we automatically assign the project owner as a member with role "MANAGER"
        ProjectMember ownerMember = ProjectMember.builder()
                .projectId(project.getProjectId())
                .userId(request.getOwnerId())
                .projectRole("MANAGER")
                .joinedAt(LocalDateTime.now())
                .build();
        projectMemberRepository.save(ownerMember);

        // Record event in activity log history
        logActivity(project.getProjectId(), currentUserId, "Project Created", null, "Project created with code " + projectCode);
        logActivity(project.getProjectId(), currentUserId, "Member Added", null, "Manager " + getUserDisplayName(request.getOwnerId()) + " automatically assigned as member.");

        return CreateProjectResponse.builder()
                .projectId(project.getProjectId())
                .projectCode(projectCode)
                .status(project.getStatus())
                .build();
    }

    // ─── 2. VIEW ASSIGNED PROJECTS ───────────────────────────────────────────
    public PaginatedResponse<ProjectDTO> getMyProjects(Long currentUserId, String status, String search, int page, int size) {
        log.info("Fetching assigned projects for user: {}, status: {}, search: {}", currentUserId, status, search);
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("projectId").descending());
        Page<Project> projectPage = projectRepository.findMyProjects(currentUserId, status, search, pageRequest);

        List<ProjectDTO> content = projectPage.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        return PaginatedResponse.<ProjectDTO>builder()
                .content(content)
                .page(projectPage.getNumber())
                .size(projectPage.getSize())
                .totalElements(projectPage.getTotalElements())
                .totalPages(projectPage.getTotalPages())
                .build();
    }

    // ─── 3. VIEW TEAM PROJECTS ───────────────────────────────────────────────
    public PaginatedResponse<ProjectDTO> getTeamProjects(String search, Long ownerId, String status, 
                                                         LocalDate startDate, LocalDate endDate, 
                                                         int page, int size, String sortBy, String sortDirection) {
        log.info("Searching team projects - search: {}, ownerId: {}, status: {}", search, ownerId, status);
        
        Sort.Direction direction = "ASC".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortField = (sortBy == null || sortBy.trim().isEmpty()) ? "projectId" : sortBy;
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(direction, sortField));

        Page<Project> projectPage = projectRepository.searchProjects(search, ownerId, status, startDate, endDate, pageRequest);

        List<ProjectDTO> content = projectPage.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        return PaginatedResponse.<ProjectDTO>builder()
                .content(content)
                .page(projectPage.getNumber())
                .size(projectPage.getSize())
                .totalElements(projectPage.getTotalElements())
                .totalPages(projectPage.getTotalPages())
                .build();
    }

    // ─── 4. GET PROJECT DETAILS ──────────────────────────────────────────────
    public ProjectDetailsDTO getProjectDetails(Long projectId, Long currentUserId) {
        log.info("Fetching project details for: {} by user: {}", projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        // Fetch related entities
        List<ProjectMemberDTO> members = getProjectMembers(projectId);
        List<ProjectMilestoneDTO> milestones = getProjectMilestones(projectId);
        List<ProjectActivityDTO> activities = getProjectRecentActivities(projectId, 5);

        ProjectStatisticsDTO stats = calculateProjectStatistics(projectId, project.getProgressPercentage());

        return ProjectDetailsDTO.builder()
                .project(mapToDTO(project))
                .members(members)
                .statistics(stats)
                .milestones(milestones)
                .recentActivities(activities)
                .build();
    }

    // ─── 5. UPDATE PROJECT ───────────────────────────────────────────────────
    @Transactional
    public void updateProject(Long projectId, ProjectDTO request, Long currentUserId) {
        log.info("Updating project: {} by user: {}", projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        // Business Rule: Completed or Archived projects cannot be updated
        if ("COMPLETED".equals(project.getStatus()) || "ARCHIVED".equals(project.getStatus()) || project.getArchived()) {
            throw new BadRequestException("Completed or archived projects cannot be updated.");
        }

        // Validation: Project name is required
        if (request.getProjectName() == null || request.getProjectName().trim().isEmpty()) {
            throw new BadRequestException("Project name is required.");
        }

        // Validation: Project name should be unique (excluding current project)
        if (projectRepository.existsByProjectNameAndProjectIdNot(request.getProjectName().trim(), projectId)) {
            throw new BadRequestException("Project name must be unique.");
        }

        // Validation: End date must be greater than or equal to start date
        if (request.getPlannedStartDate() != null && request.getPlannedEndDate() != null) {
            if (request.getPlannedEndDate().isBefore(request.getPlannedStartDate())) {
                throw new BadRequestException("Planned end date must be greater than or equal to planned start date.");
            }
        }

        String oldName = project.getProjectName();
        project.setProjectName(request.getProjectName().trim());
        project.setDescription(request.getDescription());
        project.setObjectives(request.getObjectives());
        project.setPlannedStartDate(request.getPlannedStartDate());
        project.setPlannedEndDate(request.getPlannedEndDate());

        projectRepository.save(project);

        // Record updates in activity history
        if (!oldName.equals(project.getProjectName())) {
            logActivity(projectId, currentUserId, "Name Changed", oldName, project.getProjectName());
        }
        logActivity(projectId, currentUserId, "Project Updated", null, "Project details updated.");
    }

    // ─── 6. DELETE PROJECT ───────────────────────────────────────────────────
    @Transactional
    public void deleteProject(Long projectId, Long currentUserId) {
        log.info("Deleting project: {} by user: {}", projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        // Business Rules: Cannot delete Completed or Archived projects
        if ("COMPLETED".equals(project.getStatus()) || "ARCHIVED".equals(project.getStatus()) || project.getArchived()) {
            throw new BadRequestException("Completed or archived projects cannot be deleted.");
        }

        // Business Rule: Cannot delete project having active tasks (stubbed check)
        if (hasActiveTasks(projectId)) {
            throw new BadRequestException("Cannot delete project having active tasks.");
        }

        // Cascade delete members, milestones, comments and activities is handled via database ON DELETE CASCADE constraints.
        // We delete the project entity, which triggers database-level cascades
        projectRepository.delete(project);
    }

    // ─── 7. CHANGE PROJECT STATUS ────────────────────────────────────────────
    @Transactional
    public void changeProjectStatus(Long projectId, String newStatus, Long currentUserId) {
        log.info("Changing project {} status to: {} by user: {}", projectId, newStatus, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        // Business Rule: Archived projects cannot be modified (read-only)
        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        List<String> allowedStatuses = Arrays.asList("PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED");
        if (!allowedStatuses.contains(newStatus)) {
            throw new BadRequestException("Invalid project status. Allowed values: PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED");
        }

        String oldStatus = project.getStatus();
        if (oldStatus.equals(newStatus)) {
            return;
        }

        project.setStatus(newStatus);

        // Automatically set actual start date / end date depending on transitions
        if ("ACTIVE".equals(newStatus) && project.getActualStartDate() == null) {
            project.setActualStartDate(LocalDate.now());
        }
        if ("COMPLETED".equals(newStatus) && project.getActualEndDate() == null) {
            project.setActualEndDate(LocalDate.now());
        }

        projectRepository.save(project);

        // Log status update event
        logActivity(projectId, currentUserId, "Status Changed", oldStatus, newStatus);
    }

    // ─── 8. ARCHIVE PROJECT ──────────────────────────────────────────────────
    @Transactional
    public void archiveProject(Long projectId, Long currentUserId) {
        log.info("Archiving project: {} by user: {}", projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        // Business Rule: Only completed projects can be archived
        if (!"COMPLETED".equals(project.getStatus())) {
            throw new BadRequestException("Only completed projects can be archived.");
        }

        project.setArchived(true);
        project.setStatus("ARCHIVED");
        projectRepository.save(project);

        // Log archiving event
        logActivity(projectId, currentUserId, "Project Archived", "COMPLETED", "ARCHIVED");
    }

    // ─── 9. ASSIGN PROJECT MANAGER ───────────────────────────────────────────
    @Transactional
    public void assignProjectManager(Long projectId, Long managerId, Long currentUserId) {
        log.info("Assigning project manager {} for project {} by user: {}", managerId, projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        // Business Rule: Archived projects are read-only
        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        // Verify manager user exists
        try {
            userFacade.getEmployeeDetails(managerId);
        } catch (Exception e) {
            throw new BadRequestException("Manager user does not exist with ID: " + managerId);
        }

        // Business Rule: A project manager must also be a project member
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserIdAndLeftAtIsNull(projectId, managerId)
                .orElseThrow(() -> new BadRequestException("A project manager must first be a project member. Add the user as a member before assigning as manager."));

        Long oldOwnerId = project.getOwnerId();
        if (oldOwnerId.equals(managerId)) {
            return;
        }

        project.setOwnerId(managerId);
        projectRepository.save(project);

        // Promote the member's role to MANAGER in members table
        member.setProjectRole("MANAGER");
        projectMemberRepository.save(member);

        // Log manager assignment update
        logActivity(projectId, currentUserId, "Manager Changed", getUserDisplayName(oldOwnerId), getUserDisplayName(managerId));
        publishProjectNotification(projectId, "Project Manager Assigned", "User " + getUserDisplayName(managerId) + " was assigned as Project Manager.", currentUserId);
    }

    // ─── 10. MANAGE MEMBERS ──────────────────────────────────────────────────
    @Transactional
    public void addMembers(Long projectId, AddMembersRequest request, Long currentUserId) {
        log.info("Adding members to project {} by user: {}", projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        if (request.getMembers() == null || request.getMembers().isEmpty()) {
            return;
        }

        for (AddMembersRequest.MemberEntry entry : request.getMembers()) {
            Long userId = entry.getUserId();
            String role = entry.getProjectRole();

            // Verify member user exists
            try {
                userFacade.getEmployeeDetails(userId);
            } catch (Exception e) {
                throw new BadRequestException("User does not exist with ID: " + userId);
            }

            // Check if they are already active
            projectMemberRepository.findByProjectIdAndUserIdAndLeftAtIsNull(projectId, userId).ifPresentOrElse(
                m -> {
                    // Update role if they already exist
                    m.setProjectRole(role);
                    projectMemberRepository.save(m);
                },
                () -> {
                    // Create new member record
                    ProjectMember pm = ProjectMember.builder()
                            .projectId(projectId)
                            .userId(userId)
                            .projectRole(role)
                            .joinedAt(LocalDateTime.now())
                            .build();
                    projectMemberRepository.save(pm);

                    // Log activity
                    logActivity(projectId, currentUserId, "Member Added", null, getUserDisplayName(userId) + " as " + role);
                }
            );
        }
        publishProjectNotification(projectId, "Project Members Updated", "Team members list was updated for project '" + project.getProjectName() + "'.", currentUserId);
    }

    public List<ProjectMemberDTO> listMembers(Long projectId, Long currentUserId) {
        validateProjectAccess(projectId, currentUserId);
        return getProjectMembers(projectId);
    }

    @Transactional
    public void updateMemberRole(Long projectId, Long memberId, String role, Long currentUserId) {
        log.info("Updating role of member {} in project {} to {} by user {}", memberId, projectId, role, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        ProjectMember member = projectMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Project member not found with ID: " + memberId));

        if (!member.getProjectId().equals(projectId)) {
            throw new BadRequestException("Member does not belong to this project.");
        }

        String oldRole = member.getProjectRole();
        member.setProjectRole(role);
        projectMemberRepository.save(member);

        logActivity(projectId, currentUserId, "Member Role Updated", oldRole, role + " for " + getUserDisplayName(member.getUserId()));
        publishProjectNotification(projectId, "Project Role Updated", "Role updated to " + role + " for " + getUserDisplayName(member.getUserId()), currentUserId);
    }

    @Transactional
    public void removeMember(Long projectId, Long memberId, Long currentUserId) {
        log.info("Removing member {} from project {} by user {}", memberId, projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        ProjectMember member = projectMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Project member not found with ID: " + memberId));

        if (!member.getProjectId().equals(projectId)) {
            throw new BadRequestException("Member does not belong to this project.");
        }

        // Business Rule: Cannot remove member having active tasks (stub check)
        if (hasActiveTasksForMember(projectId, member.getUserId())) {
            throw new BadRequestException("Cannot remove member having active tasks.");
        }

        // Soft delete by setting left_at timestamp
        member.setLeftAt(LocalDateTime.now());
        projectMemberRepository.save(member);

        logActivity(projectId, currentUserId, "Member Removed", null, getUserDisplayName(member.getUserId()));
    }

    // ─── 11. PROJECT DOCUMENTS ───────────────────────────────────────────────
    @Transactional
    public ProjectDocument uploadDocument(Long projectId, MultipartFile file, Long currentUserId) {
        log.info("Uploading document for project {} by user {}", projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded file cannot be empty.");
        }

        // Construct a unique storage filepath to prevent collisions: project-{id}/{uuid}-{filename}
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String uniqueFilePath = "project-" + projectId + "/" + UUID.randomUUID().toString().substring(0, 8) + "-" + originalFilename;

        // Upload to S3 storage via StorageService
        String filePath = storageService.uploadFile(file, BUCKET_NAME, uniqueFilePath);

        ProjectDocument doc = ProjectDocument.builder()
                .projectId(projectId)
                .documentName(originalFilename)
                .filePath(filePath)
                .fileSize(file.getSize())
                .fileType(file.getContentType())
                .uploadedBy(currentUserId)
                .build();

        doc = projectDocumentRepository.save(doc);

        logActivity(projectId, currentUserId, "Document Uploaded", null, originalFilename);
        publishProjectNotification(projectId, "Project Document Uploaded", "New document '" + originalFilename + "' uploaded to project '" + project.getProjectName() + "'.", currentUserId);

        return doc;
    }

    public List<ProjectDocument> listDocuments(Long projectId, Long currentUserId) {
        validateProjectAccess(projectId, currentUserId);
        return projectDocumentRepository.findByProjectId(projectId);
    }

    public InputStream downloadDocument(Long projectId, Long documentId, Long currentUserId) {
        validateProjectAccess(projectId, currentUserId);

        ProjectDocument doc = projectDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        if (!doc.getProjectId().equals(projectId)) {
            throw new BadRequestException("Document does not belong to this project.");
        }

        // Return file input stream from S3 storage
        return storageService.downloadFile(BUCKET_NAME, doc.getFilePath());
    }

    @Transactional
    public void deleteDocument(Long projectId, Long documentId, Long currentUserId) {
        log.info("Deleting document {} from project {} by user {}", documentId, projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        ProjectDocument doc = projectDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        if (!doc.getProjectId().equals(projectId)) {
            throw new BadRequestException("Document does not belong to this project.");
        }

        // Delete from S3 storage
        try {
            storageService.deleteFile(BUCKET_NAME, doc.getFilePath());
        } catch (Exception e) {
            log.error("Failed to delete physical file from S3 bucket: {}", doc.getFilePath(), e);
        }

        // Delete from DB metadata record
        projectDocumentRepository.delete(doc);

        logActivity(projectId, currentUserId, "Document Deleted", doc.getDocumentName(), null);
    }

    // ─── 12. PROJECT COMMENTS ────────────────────────────────────────────────
    @Transactional
    public ProjectComment createComment(Long projectId, String commentText, Long currentUserId) {
        log.info("Adding comment to project {} by user {}", projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        if (commentText == null || commentText.trim().isEmpty()) {
            throw new BadRequestException("Comment body cannot be blank.");
        }

        ProjectComment comment = ProjectComment.builder()
                .projectId(projectId)
                .userId(currentUserId)
                .comment(commentText.trim())
                .build();

        comment = projectCommentRepository.save(comment);

        logActivity(projectId, currentUserId, "Comment Added", null, commentText.trim());

        return comment;
    }

    public List<ProjectComment> listComments(Long projectId, Long currentUserId) {
        validateProjectAccess(projectId, currentUserId);
        return projectCommentRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    @Transactional
    public void deleteComment(Long projectId, Long commentId, Long currentUserId) {
        log.info("Deleting comment {} from project {} by user {}", commentId, projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        ProjectComment comment = projectCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found with ID: " + commentId));

        if (!comment.getProjectId().equals(projectId)) {
            throw new BadRequestException("Comment does not belong to this project.");
        }

        // Validate comments owner or project manager permissions
        boolean isCommentOwner = comment.getUserId().equals(currentUserId);
        boolean isProjectManager = project.getOwnerId().equals(currentUserId);
        boolean isAdmin = hasAuthority("PROJECT_DELETE"); // Assuming admin permission

        if (!isCommentOwner && !isProjectManager && !isAdmin) {
            throw new AccessDeniedException("You do not have permission to delete this comment.");
        }

        projectCommentRepository.delete(comment);
    }

    // ─── 13. MILESTONES ──────────────────────────────────────────────────────
    @Transactional
    public ProjectMilestone createMilestone(Long projectId, ProjectMilestoneDTO dto, Long currentUserId) {
        log.info("Creating milestone for project {} by user {}", projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        if (dto.getMilestoneName() == null || dto.getMilestoneName().trim().isEmpty()) {
            throw new BadRequestException("Milestone name is required.");
        }

        ProjectMilestone ms = ProjectMilestone.builder()
                .projectId(projectId)
                .milestoneName(dto.getMilestoneName().trim())
                .description(dto.getDescription())
                .targetDate(dto.getTargetDate())
                .status("PENDING")
                .build();

        ms = projectMilestoneRepository.save(ms);

        logActivity(projectId, currentUserId, "Milestone Created", null, dto.getMilestoneName());

        return ms;
    }

    public List<ProjectMilestone> listMilestones(Long projectId, Long currentUserId) {
        validateProjectAccess(projectId, currentUserId);
        return projectMilestoneRepository.findByProjectId(projectId);
    }

    @Transactional
    public void updateMilestone(Long projectId, Long milestoneId, ProjectMilestoneDTO dto, Long currentUserId) {
        log.info("Updating milestone {} in project {} by user {}", milestoneId, projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        ProjectMilestone ms = projectMilestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with ID: " + milestoneId));

        if (!ms.getProjectId().equals(projectId)) {
            throw new BadRequestException("Milestone does not belong to this project.");
        }

        ms.setMilestoneName(dto.getMilestoneName());
        ms.setDescription(dto.getDescription());
        ms.setTargetDate(dto.getTargetDate());
        if (dto.getStatus() != null) {
            ms.setStatus(dto.getStatus());
        }

        projectMilestoneRepository.save(ms);

        logActivity(projectId, currentUserId, "Milestone Updated", null, ms.getMilestoneName());
    }

    @Transactional
    public void deleteMilestone(Long projectId, Long milestoneId, Long currentUserId) {
        log.info("Deleting milestone {} from project {} by user {}", milestoneId, projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        ProjectMilestone ms = projectMilestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with ID: " + milestoneId));

        if (!ms.getProjectId().equals(projectId)) {
            throw new BadRequestException("Milestone does not belong to this project.");
        }

        projectMilestoneRepository.delete(ms);

        logActivity(projectId, currentUserId, "Milestone Deleted", ms.getMilestoneName(), null);
    }

    @Transactional
    public void completeMilestone(Long projectId, Long milestoneId, Long currentUserId) {
        log.info("Completing milestone {} in project {} by user {}", milestoneId, projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        if (project.getArchived() || "ARCHIVED".equals(project.getStatus())) {
            throw new BadRequestException("Archived projects are read-only and cannot be modified.");
        }

        ProjectMilestone ms = projectMilestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with ID: " + milestoneId));

        if (!ms.getProjectId().equals(projectId)) {
            throw new BadRequestException("Milestone does not belong to this project.");
        }

        ms.setStatus("COMPLETED");
        ms.setCompletedDate(LocalDate.now());
        projectMilestoneRepository.save(ms);

        logActivity(projectId, currentUserId, "Milestone Completed", null, ms.getMilestoneName());
        publishProjectNotification(projectId, "Project Milestone Completed", "Milestone '" + ms.getMilestoneName() + "' was marked completed.", currentUserId);
    }

    // ─── 14. PROJECT ACTIVITY HISTORY ────────────────────────────────────────
    public List<ProjectActivityDTO> getActivities(Long projectId, Long currentUserId) {
        validateProjectAccess(projectId, currentUserId);
        return getProjectRecentActivities(projectId, 100);
    }

    // ─── 15. PROJECT REPORTS ─────────────────────────────────────────────────
    public ProjectReportDTO getReport(Long projectId, Long currentUserId) {
        log.info("Generating project report for: {} by user: {}", projectId, currentUserId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        List<ProjectMemberDTO> members = getProjectMembers(projectId);
        List<ProjectMilestoneDTO> milestones = getProjectMilestones(projectId);

        ProjectReportDTO.TimelineDTO timeline = ProjectReportDTO.TimelineDTO.builder()
                .plannedStartDate(project.getPlannedStartDate())
                .plannedEndDate(project.getPlannedEndDate())
                .actualStartDate(project.getActualStartDate())
                .actualEndDate(project.getActualEndDate())
                .build();

        return ProjectReportDTO.builder()
                .summary(mapToDTO(project))
                .members(members)
                .progress(project.getProgressPercentage())
                .milestones(milestones)
                .tasks(new ArrayList<>()) // Tasks are mock placeholders for now
                .timeline(timeline)
                .build();
    }

    public byte[] exportReport(Long projectId, String format, Long currentUserId) {
        log.info("Exporting project report {} as format: {}", projectId, format);
        
        ProjectReportDTO report = getReport(projectId, currentUserId);
        
        if ("excel".equalsIgnoreCase(format) || "csv".equalsIgnoreCase(format)) {
            StringBuilder csv = new StringBuilder();
            csv.append("PROJECT REPORT: ").append(report.getSummary().getProjectName()).append(" (").append(report.getSummary().getProjectCode()).append(")\n\n");
            
            csv.append("SUMMARY\n");
            csv.append("Description,").append(report.getSummary().getDescription()).append("\n");
            csv.append("Objectives,").append(report.getSummary().getObjectives()).append("\n");
            csv.append("Status,").append(report.getSummary().getStatus()).append("\n");
            csv.append("Progress,").append(report.getProgress()).append("%\n");
            csv.append("Owner,").append(report.getSummary().getOwnerName()).append("\n\n");
            
            csv.append("TIMELINE\n");
            csv.append("Planned Start Date,").append(report.getTimeline().getPlannedStartDate()).append("\n");
            csv.append("Planned End Date,").append(report.getTimeline().getPlannedEndDate()).append("\n");
            csv.append("Actual Start Date,").append(report.getTimeline().getActualStartDate()).append("\n");
            csv.append("Actual End Date,").append(report.getTimeline().getActualEndDate()).append("\n\n");
            
            csv.append("MEMBERS\n");
            csv.append("User ID,Name,Email,Role,Joined At\n");
            for (ProjectMemberDTO m : report.getMembers()) {
                csv.append(m.getUserId()).append(",")
                   .append(m.getDisplayName()).append(",")
                   .append(m.getEmail() != null ? m.getEmail() : "").append(",")
                   .append(m.getProjectRole()).append(",")
                   .append(m.getJoinedAt()).append("\n");
            }
            csv.append("\n");

            csv.append("MILESTONES\n");
            csv.append("Milestone Name,Description,Target Date,Completed Date,Status\n");
            for (ProjectMilestoneDTO ms : report.getMilestones()) {
                csv.append(ms.getMilestoneName()).append(",")
                   .append(ms.getDescription() != null ? ms.getDescription() : "").append(",")
                   .append(ms.getTargetDate() != null ? ms.getTargetDate() : "").append(",")
                   .append(ms.getCompletedDate() != null ? ms.getCompletedDate() : "").append(",")
                   .append(ms.getStatus()).append("\n");
            }

            return csv.toString().getBytes(StandardCharsets.UTF_8);

        } else {
            // PDF Format mock (Text format representing PDF download structure)
            StringBuilder pdf = new StringBuilder();
            pdf.append("========================================================================\n");
            pdf.append("                          PROJECT STATUS REPORT\n");
            pdf.append("========================================================================\n\n");
            
            pdf.append("PROJECT: ").append(report.getSummary().getProjectName()).append(" (").append(report.getSummary().getProjectCode()).append(")\n");
            pdf.append("STATUS : ").append(report.getSummary().getStatus()).append("\n");
            pdf.append("PROGRESS: ").append(report.getProgress()).append("%\n\n");
            
            pdf.append("TIMELINE:\n");
            pdf.append("  Planned: ").append(report.getTimeline().getPlannedStartDate()).append(" to ").append(report.getTimeline().getPlannedEndDate()).append("\n");
            pdf.append("  Actual : ").append(report.getTimeline().getActualStartDate() != null ? report.getTimeline().getActualStartDate() : "-").append(" to ").append(report.getTimeline().getActualEndDate() != null ? report.getTimeline().getActualEndDate() : "-").append("\n\n");
            
            pdf.append("MEMBERS:\n");
            for (ProjectMemberDTO m : report.getMembers()) {
                pdf.append("  * ").append(m.getDisplayName()).append(" (").append(m.getProjectRole()).append(")\n");
            }
            pdf.append("\n");

            pdf.append("MILESTONES:\n");
            for (ProjectMilestoneDTO ms : report.getMilestones()) {
                pdf.append("  - [").append(ms.getStatus()).append("] ").append(ms.getMilestoneName()).append(" (Target: ").append(ms.getTargetDate()).append(")\n");
            }
            pdf.append("\n========================================================================\n");

            return pdf.toString().getBytes(StandardCharsets.UTF_8);
        }
    }

    // ─── 16. DASHBOARD METRICS ───────────────────────────────────────────────
    public ProjectDashboardDTO getDashboard(Long currentUserId) {
        log.info("Loading project manager dashboard metrics");
        
        long total = projectRepository.count();
        long active = projectRepository.countByStatus("ACTIVE");
        long completed = projectRepository.countByStatus("COMPLETED");
        long planning = projectRepository.countByStatus("PLANNING");
        long overdue = projectRepository.countOverdueProjects(LocalDate.now());
        long upcomingMilestones = projectMilestoneRepository.countUpcomingMilestones(LocalDate.now());

        // Fetch global activities list
        List<ProjectActivityDTO> recentActivities = projectActivityRepository.findRecentActivities(PageRequest.of(0, 10))
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        return ProjectDashboardDTO.builder()
                .totalProjects(total)
                .activeProjects(active)
                .completedProjects(completed)
                .planningProjects(planning)
                .overdueProjects(overdue)
                .upcomingMilestones(upcomingMilestones)
                .recentActivities(recentActivities)
                .build();
    }

    // ─── 17. PROJECT STATISTICS ──────────────────────────────────────────────
    public ProjectStatisticsDTO getStatistics(Long projectId, Long currentUserId) {
        log.info("Loading project statistics for {}", projectId);
        
        Project project = getProjectOrThrow(projectId);
        validateProjectAccess(projectId, currentUserId);

        return calculateProjectStatistics(projectId, project.getProgressPercentage());
    }


    // ─── HELPERS & COMMON LOGIC ──────────────────────────────────────────────

    private Project getProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with ID: " + projectId));
    }

    private void validateProjectAccess(Long projectId, Long userId) {
        if (hasAuthority("PROJECT_VIEW_TEAM") || hasAuthority("ROLE_ADMIN") || hasAuthority("ROLE_MANAGER")) {
            return;
        }
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project != null && (userId.equals(project.getOwnerId()) || userId.equals(project.getCreatedBy()))) {
            return;
        }
        if (hasAuthority("PROJECT_VIEW_ASSIGNED") || hasAuthority("PROJECT_DOCUMENT_UPLOAD")) {
            boolean isMember = projectMemberRepository.existsByProjectIdAndUserIdAndLeftAtIsNull(projectId, userId);
            if (isMember) {
                return;
            }
        }
        throw new AccessDeniedException("You do not have access permissions for Project ID " + projectId);
    }

    private List<String> getCurrentUserAuthorities() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .map(a -> a.getAuthority())
                .collect(Collectors.toList());
    }

    private boolean hasAuthority(String authority) {
        return getCurrentUserAuthorities().contains(authority);
    }

    private ProjectDTO mapToDTO(Project project) {
        if (project == null) return null;
        return ProjectDTO.builder()
                .projectId(project.getProjectId())
                .projectCode(project.getProjectCode())
                .projectName(project.getProjectName())
                .description(project.getDescription())
                .objectives(project.getObjectives())
                .ownerId(project.getOwnerId())
                .ownerName(getUserDisplayName(project.getOwnerId()))
                .status(project.getStatus())
                .plannedStartDate(project.getPlannedStartDate())
                .plannedEndDate(project.getPlannedEndDate())
                .actualStartDate(project.getActualStartDate())
                .actualEndDate(project.getActualEndDate())
                .progressPercentage(project.getProgressPercentage())
                .archived(project.getArchived())
                .createdBy(project.getCreatedBy())
                .creatorName(getUserDisplayName(project.getCreatedBy()))
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    private List<ProjectMemberDTO> getProjectMembers(Long projectId) {
        return projectMemberRepository.findByProjectIdAndLeftAtIsNull(projectId).stream()
                .map(m -> ProjectMemberDTO.builder()
                        .projectMemberId(m.getProjectMemberId())
                        .projectId(m.getProjectId())
                        .userId(m.getUserId())
                        .displayName(getUserDisplayName(m.getUserId()))
                        .email(getUserEmail(m.getUserId()))
                        .projectRole(m.getProjectRole())
                        .joinedAt(m.getJoinedAt())
                        .leftAt(m.getLeftAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<ProjectMilestoneDTO> getProjectMilestones(Long projectId) {
        return projectMilestoneRepository.findByProjectId(projectId).stream()
                .map(ms -> ProjectMilestoneDTO.builder()
                        .milestoneId(ms.getMilestoneId())
                        .projectId(ms.getProjectId())
                        .milestoneName(ms.getMilestoneName())
                        .description(ms.getDescription())
                        .targetDate(ms.getTargetDate())
                        .completedDate(ms.getCompletedDate())
                        .status(ms.getStatus())
                        .createdAt(ms.getCreatedAt())
                        .updatedAt(ms.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<ProjectActivityDTO> getProjectRecentActivities(Long projectId, int limit) {
        List<ProjectActivity> activities = projectActivityRepository.findByProjectIdOrderByActivityTimeDesc(projectId);
        return activities.stream()
                .limit(limit)
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private ProjectActivityDTO mapToDTO(ProjectActivity pa) {
        return ProjectActivityDTO.builder()
                .activityId(pa.getActivityId())
                .projectId(pa.getProjectId())
                .userId(pa.getUserId())
                .userDisplayName(getUserDisplayName(pa.getUserId()))
                .activityType(pa.getActivityType())
                .oldValue(pa.getOldValue())
                .newValue(pa.getNewValue())
                .activityTime(pa.getActivityTime())
                .build();
    }

    private ProjectStatisticsDTO calculateProjectStatistics(Long projectId, int progress) {
        long members = projectMemberRepository.countByProjectIdAndLeftAtIsNull(projectId);
        long milestones = projectMilestoneRepository.countByProjectId(projectId);
        long completedMilestones = projectMilestoneRepository.countByProjectIdAndStatus(projectId, "COMPLETED");

        return ProjectStatisticsDTO.builder()
                .members(members)
                .tasks(0)
                .completedTasks(0)
                .pendingTasks(0)
                .progress(progress)
                .milestones(milestones)
                .completedMilestones(completedMilestones)
                .build();
    }

    private String getUserDisplayName(Long userId) {
        try {
            EmployeeDetailsDTO details = userFacade.getEmployeeDetails(userId);
            return details != null ? details.getDisplayName() : "User " + userId;
        } catch (Exception e) {
            return "User " + userId;
        }
    }

    private String getUserEmail(Long userId) {
        try {
            EmployeeDetailsDTO details = userFacade.getEmployeeDetails(userId);
            return details != null ? details.getEmail() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private void logActivity(Long projectId, Long userId, String activityType, String oldValue, String newValue) {
        ProjectActivity activity = ProjectActivity.builder()
                .projectId(projectId)
                .userId(userId)
                .activityType(activityType)
                .oldValue(oldValue)
                .newValue(newValue)
                .build();
        projectActivityRepository.save(activity);
    }

    private boolean hasActiveTasks(Long projectId) {
        // Task module is coming soon, currently no tasks exist
        return false;
    }

    private boolean hasActiveTasksForMember(Long projectId, Long userId) {
        // Task module is coming soon, currently no tasks exist
        return false;
    }

    private void publishProjectNotification(Long projectId, String title, String message, Long actorUserId) {
        try {
            Set<Long> recipientIds = new HashSet<>();
            Project project = projectRepository.findById(projectId).orElse(null);
            if (project != null) {
                if (project.getOwnerId() != null) recipientIds.add(project.getOwnerId());
                if (project.getCreatedBy() != null) recipientIds.add(project.getCreatedBy());
            }
            List<ProjectMember> members = projectMemberRepository.findByProjectIdAndLeftAtIsNull(projectId);
            if (members != null) {
                for (ProjectMember m : members) {
                    if (m.getUserId() != null) {
                        recipientIds.add(m.getUserId());
                    }
                }
            }
            if (actorUserId != null) {
                recipientIds.remove(actorUserId);
            }
            if (!recipientIds.isEmpty()) {
                eventPublisher.publishEvent(new NotificationEvent(
                        new ArrayList<>(recipientIds),
                        "PROJECT",
                        title,
                        message,
                        "PROJECT",
                        projectId,
                        actorUserId
                ));
            }
        } catch (Exception e) {
            log.warn("Failed to publish project notification: {}", e.getMessage());
        }
    }
}

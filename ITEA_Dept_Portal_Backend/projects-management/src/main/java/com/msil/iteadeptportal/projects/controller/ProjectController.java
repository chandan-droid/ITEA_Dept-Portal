package com.msil.iteadeptportal.projects.controller;

import com.msil.iteadeptportal.employee.api.UserDTO;
import com.msil.iteadeptportal.employee.api.UserFacade;
import com.msil.iteadeptportal.projects.api.*;
import com.msil.iteadeptportal.projects.model.ProjectComment;
import com.msil.iteadeptportal.projects.model.ProjectDocument;
import com.msil.iteadeptportal.projects.model.ProjectMilestone;
import com.msil.iteadeptportal.projects.service.ProjectService;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final UserFacade userFacade;

    // ─── Helpers ──────────────────────────────────────────────────────────────
    
    private Long resolveUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userFacade.getUserBySamAccountName(username)
                .map(UserDTO::getUserId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + username));
    }

    // ─── 1. CREATE PROJECT ───────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAuthority('PROJECT_CREATE')")
    public ResponseEntity<ApiResponse<CreateProjectResponse>> createProject(@RequestBody CreateProjectRequest request) {
        Long userId = resolveUserId();
        CreateProjectResponse response = projectService.createProject(request, userId);
        return new ResponseEntity<>(ApiResponse.success(response, "Project created successfully."), HttpStatus.CREATED);
    }

    // ─── 2. VIEW ASSIGNED PROJECTS ───────────────────────────────────────────
    @GetMapping("/my")
    @PreAuthorize("hasAuthority('PROJECT_VIEW_ASSIGNED')")
    public ResponseEntity<ApiResponse<PaginatedResponse<ProjectDTO>>> getMyProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        
        Long userId = resolveUserId();
        PaginatedResponse<ProjectDTO> response = projectService.getMyProjects(userId, status, search, page, size);
        return ResponseEntity.ok(ApiResponse.success(response, "Assigned projects retrieved."));
    }

    // ─── 3. VIEW TEAM PROJECTS ───────────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasAuthority('PROJECT_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<PaginatedResponse<ProjectDTO>>> getTeamProjects(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long ownerId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "projectId") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {

        PaginatedResponse<ProjectDTO> response = projectService.getTeamProjects(
                search, ownerId, status, startDate, endDate, page, size, sortBy, sortDirection);
        return ResponseEntity.ok(ApiResponse.success(response, "Team projects retrieved."));
    }

    // ─── 4. GET PROJECT DETAILS ──────────────────────────────────────────────
    @GetMapping("/{projectId}")
    @PreAuthorize("hasAnyAuthority('PROJECT_VIEW_ASSIGNED', 'PROJECT_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<ProjectDetailsDTO>> getProjectDetails(@PathVariable Long projectId) {
        Long userId = resolveUserId();
        ProjectDetailsDTO response = projectService.getProjectDetails(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Project details retrieved."));
    }

    // ─── 5. UPDATE PROJECT ───────────────────────────────────────────────────
    @PutMapping("/{projectId}")
    @PreAuthorize("hasAuthority('PROJECT_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> updateProject(
            @PathVariable Long projectId,
            @RequestBody ProjectDTO request) {
        
        Long userId = resolveUserId();
        projectService.updateProject(projectId, request, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Project updated successfully."));
    }

    // ─── 6. DELETE PROJECT ───────────────────────────────────────────────────
    @DeleteMapping("/{projectId}")
    @PreAuthorize("hasAuthority('PROJECT_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteProject(@PathVariable Long projectId) {
        Long userId = resolveUserId();
        projectService.deleteProject(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Project deleted successfully."));
    }

    // ─── 7. CHANGE PROJECT STATUS ────────────────────────────────────────────
    @PatchMapping("/{projectId}/status")
    @PreAuthorize("hasAuthority('PROJECT_CHANGE_STATUS')")
    public ResponseEntity<ApiResponse<Void>> changeProjectStatus(
            @PathVariable Long projectId,
            @RequestBody Map<String, String> body) {
        
        String status = body.get("status");
        Long userId = resolveUserId();
        projectService.changeProjectStatus(projectId, status, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Project status updated to " + status + "."));
    }

    // ─── 8. ARCHIVE PROJECT ──────────────────────────────────────────────────
    @PatchMapping("/{projectId}/archive")
    @PreAuthorize("hasAuthority('PROJECT_ARCHIVE')")
    public ResponseEntity<ApiResponse<Void>> archiveProject(@PathVariable Long projectId) {
        Long userId = resolveUserId();
        projectService.archiveProject(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Project archived successfully."));
    }

    // ─── 9. ASSIGN PROJECT MANAGER ───────────────────────────────────────────
    @PatchMapping("/{projectId}/manager")
    @PreAuthorize("hasAuthority('PROJECT_ASSIGN_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> assignProjectManager(
            @PathVariable Long projectId,
            @RequestBody Map<String, Long> body) {
        
        Long managerId = body.get("managerId");
        Long userId = resolveUserId();
        projectService.assignProjectManager(projectId, managerId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Project manager assigned successfully."));
    }

    // ─── 10. MANAGE MEMBERS ──────────────────────────────────────────────────
    @PostMapping("/{projectId}/members")
    @PreAuthorize("hasAuthority('PROJECT_MANAGE_MEMBERS')")
    public ResponseEntity<ApiResponse<Void>> addMembers(
            @PathVariable Long projectId,
            @RequestBody AddMembersRequest request) {
        
        Long userId = resolveUserId();
        projectService.addMembers(projectId, request, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Members added successfully."));
    }

    @GetMapping("/{projectId}/members")
    @PreAuthorize("hasAuthority('PROJECT_VIEW_ASSIGNED')")
    public ResponseEntity<ApiResponse<List<ProjectMemberDTO>>> listMembers(@PathVariable Long projectId) {
        Long userId = resolveUserId();
        List<ProjectMemberDTO> response = projectService.listMembers(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Project members list retrieved."));
    }

    @PutMapping("/{projectId}/members/{memberId}")
    @PreAuthorize("hasAuthority('PROJECT_MANAGE_MEMBERS')")
    public ResponseEntity<ApiResponse<Void>> updateMemberRole(
            @PathVariable Long projectId,
            @PathVariable Long memberId,
            @RequestBody Map<String, String> body) {
        
        String role = body.get("projectRole");
        Long userId = resolveUserId();
        projectService.updateMemberRole(projectId, memberId, role, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Member role updated successfully."));
    }

    @DeleteMapping("/{projectId}/members/{memberId}")
    @PreAuthorize("hasAuthority('PROJECT_MANAGE_MEMBERS')")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable Long projectId,
            @PathVariable Long memberId) {
        
        Long userId = resolveUserId();
        projectService.removeMember(projectId, memberId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Member removed successfully."));
    }

    // ─── 11. PROJECT DOCUMENTS ───────────────────────────────────────────────
    @PostMapping(value = "/{projectId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('PROJECT_DOCUMENT_UPLOAD', 'PROJECT_VIEW_ASSIGNED', 'PROJECT_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<ProjectDocument>> uploadDocument(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file) {
        
        Long userId = resolveUserId();
        ProjectDocument response = projectService.uploadDocument(projectId, file, userId);
        return new ResponseEntity<>(ApiResponse.success(response, "Document uploaded successfully."), HttpStatus.CREATED);
    }

    @GetMapping("/{projectId}/documents")
    @PreAuthorize("hasAuthority('PROJECT_VIEW_ASSIGNED')")
    public ResponseEntity<ApiResponse<List<ProjectDocument>>> listDocuments(@PathVariable Long projectId) {
        Long userId = resolveUserId();
        List<ProjectDocument> response = projectService.listDocuments(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Project documents retrieved."));
    }

    @GetMapping("/{projectId}/documents/{documentId}")
    @PreAuthorize("hasAuthority('PROJECT_VIEW_ASSIGNED')")
    public ResponseEntity<InputStreamResource> downloadDocument(
            @PathVariable Long projectId,
            @PathVariable Long documentId) {
        
        Long userId = resolveUserId();
        InputStream is = projectService.downloadDocument(projectId, documentId, userId);
        
        // Find filename for headers
        String filename = "document";
        try {
            List<ProjectDocument> docs = projectService.listDocuments(projectId, userId);
            for (ProjectDocument d : docs) {
                if (d.getDocumentId().equals(documentId)) {
                    filename = d.getDocumentName();
                    break;
                }
            }
        } catch (Exception e) {
            // fallback
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(is));
    }

    @DeleteMapping("/{projectId}/documents/{documentId}")
    @PreAuthorize("hasAuthority('PROJECT_DOCUMENT_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable Long projectId,
            @PathVariable Long documentId) {
        
        Long userId = resolveUserId();
        projectService.deleteDocument(projectId, documentId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Document deleted successfully."));
    }

    // ─── 12. PROJECT COMMENTS ────────────────────────────────────────────────
    @PostMapping("/{projectId}/comments")
    @PreAuthorize("hasAuthority('PROJECT_COMMENT_CREATE')")
    public ResponseEntity<ApiResponse<ProjectComment>> createComment(
            @PathVariable Long projectId,
            @RequestBody Map<String, String> body) {
        
        String comment = body.get("comment");
        Long userId = resolveUserId();
        ProjectComment response = projectService.createComment(projectId, comment, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Comment added successfully."));
    }

    @GetMapping("/{projectId}/comments")
    @PreAuthorize("hasAuthority('PROJECT_VIEW_ASSIGNED')")
    public ResponseEntity<ApiResponse<List<ProjectComment>>> listComments(@PathVariable Long projectId) {
        Long userId = resolveUserId();
        List<ProjectComment> response = projectService.listComments(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Comments retrieved successfully."));
    }

    @DeleteMapping("/{projectId}/comments/{commentId}")
    @PreAuthorize("hasAuthority('PROJECT_COMMENT_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long projectId,
            @PathVariable Long commentId) {
        
        Long userId = resolveUserId();
        projectService.deleteComment(projectId, commentId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Comment deleted successfully."));
    }

    // ─── 13. MILESTONES ──────────────────────────────────────────────────────
    @PostMapping("/{projectId}/milestones")
    @PreAuthorize("hasAuthority('PROJECT_UPDATE')")
    public ResponseEntity<ApiResponse<ProjectMilestone>> createMilestone(
            @PathVariable Long projectId,
            @RequestBody ProjectMilestoneDTO dto) {
        
        Long userId = resolveUserId();
        ProjectMilestone response = projectService.createMilestone(projectId, dto, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Milestone created successfully."));
    }

    @GetMapping("/{projectId}/milestones")
    @PreAuthorize("hasAuthority('PROJECT_VIEW_ASSIGNED')")
    public ResponseEntity<ApiResponse<List<ProjectMilestone>>> listMilestones(@PathVariable Long projectId) {
        Long userId = resolveUserId();
        List<ProjectMilestone> response = projectService.listMilestones(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Milestones list retrieved."));
    }

    @PutMapping("/{projectId}/milestones/{milestoneId}")
    @PreAuthorize("hasAuthority('PROJECT_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> updateMilestone(
            @PathVariable Long projectId,
            @PathVariable Long milestoneId,
            @RequestBody ProjectMilestoneDTO dto) {
        
        Long userId = resolveUserId();
        projectService.updateMilestone(projectId, milestoneId, dto, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Milestone updated successfully."));
    }

    @DeleteMapping("/{projectId}/milestones/{milestoneId}")
    @PreAuthorize("hasAuthority('PROJECT_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> deleteMilestone(
            @PathVariable Long projectId,
            @PathVariable Long milestoneId) {
        
        Long userId = resolveUserId();
        projectService.deleteMilestone(projectId, milestoneId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Milestone deleted successfully."));
    }

    @PatchMapping("/{projectId}/milestones/{milestoneId}/complete")
    @PreAuthorize("hasAuthority('PROJECT_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> completeMilestone(
            @PathVariable Long projectId,
            @PathVariable Long milestoneId) {
        
        Long userId = resolveUserId();
        projectService.completeMilestone(projectId, milestoneId, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Milestone completed successfully."));
    }

    // ─── 14. PROJECT ACTIVITY HISTORY ────────────────────────────────────────
    @GetMapping("/{projectId}/activities")
    @PreAuthorize("hasAuthority('PROJECT_ACTIVITY_VIEW')")
    public ResponseEntity<ApiResponse<List<ProjectActivityDTO>>> getActivities(@PathVariable Long projectId) {
        Long userId = resolveUserId();
        List<ProjectActivityDTO> response = projectService.getActivities(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Project activity history retrieved."));
    }

    // ─── 15. PROJECT REPORTS ─────────────────────────────────────────────────
    @GetMapping("/{projectId}/report")
    @PreAuthorize("hasAuthority('PROJECT_REPORT_VIEW')")
    public ResponseEntity<ApiResponse<ProjectReportDTO>> getReport(@PathVariable Long projectId) {
        Long userId = resolveUserId();
        ProjectReportDTO response = projectService.getReport(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Project report details retrieved."));
    }

    @GetMapping("/{projectId}/report/export")
    @PreAuthorize("hasAuthority('PROJECT_REPORT_EXPORT')")
    public ResponseEntity<byte[]> exportReport(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "pdf") String format) {
        
        Long userId = resolveUserId();
        byte[] content = projectService.exportReport(projectId, format, userId);
        
        String mimeType = "pdf".equalsIgnoreCase(format) ? "application/pdf" : "text/csv";
        String filename = "report-" + projectId + ("pdf".equalsIgnoreCase(format) ? ".pdf" : ".csv");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(mimeType))
                .body(content);
    }

    // ─── 16. PROJECT DASHBOARD ───────────────────────────────────────────────
    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('PROJECT_VIEW_TEAM')")
    public ResponseEntity<ApiResponse<ProjectDashboardDTO>> getDashboard() {
        Long userId = resolveUserId();
        ProjectDashboardDTO response = projectService.getDashboard(userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Project dashboard details retrieved."));
    }

    // ─── 17. PROJECT STATISTICS ──────────────────────────────────────────────
    @GetMapping("/{projectId}/statistics")
    @PreAuthorize("hasAuthority('PROJECT_VIEW_ASSIGNED')")
    public ResponseEntity<ApiResponse<ProjectStatisticsDTO>> getStatistics(@PathVariable Long projectId) {
        Long userId = resolveUserId();
        ProjectStatisticsDTO response = projectService.getStatistics(projectId, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Project statistics retrieved."));
    }
}

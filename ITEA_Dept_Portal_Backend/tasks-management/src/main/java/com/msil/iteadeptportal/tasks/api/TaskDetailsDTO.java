package com.msil.iteadeptportal.tasks.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskDetailsDTO {
    private Long taskId;
    private String taskCode;
    private String title;
    private String description;
    private String status;
    private String priority;
    private String category;
    private Long projectId;
    private Integer progress;
    private LocalDate startDate;
    private LocalDate dueDate;
    private Boolean archived;
    private Long createdBy;
    private String creatorName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // Full related data
    private List<TaskAssigneeDTO>      assignees;
    private List<TaskChecklistItemDTO> checklist;
    private List<TaskCommentDTO>       comments;
    private List<TaskAttachmentDTO>    attachments;
}

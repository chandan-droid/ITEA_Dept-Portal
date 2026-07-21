package com.msil.iteadeptportal.tasks.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskDTO {
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
    // Summary counts
    private int assigneeCount;
    private int checklistCount;
    private int commentCount;
}

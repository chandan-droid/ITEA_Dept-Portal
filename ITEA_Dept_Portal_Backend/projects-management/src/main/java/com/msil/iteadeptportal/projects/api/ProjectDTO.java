package com.msil.iteadeptportal.projects.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectDTO {
    private Long projectId;
    private String projectCode;
    private String projectName;
    private String description;
    private String objectives;
    private Long ownerId;
    private String ownerName;
    private String status;
    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;
    private LocalDate actualStartDate;
    private LocalDate actualEndDate;
    private Integer progressPercentage;
    private Boolean archived;
    private Long createdBy;
    private String creatorName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

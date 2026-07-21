package com.msil.iteadeptportal.projects.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectMilestoneDTO {
    private Long milestoneId;
    private Long projectId;
    private String milestoneName;
    private String description;
    private LocalDate targetDate;
    private LocalDate completedDate;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

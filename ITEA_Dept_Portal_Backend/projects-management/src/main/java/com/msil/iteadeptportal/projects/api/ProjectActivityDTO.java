package com.msil.iteadeptportal.projects.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectActivityDTO {
    private Long activityId;
    private Long projectId;
    private Long userId;
    private String userDisplayName;
    private String activityType;
    private String oldValue;
    private String newValue;
    private LocalDateTime activityTime;
}

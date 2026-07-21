package com.msil.iteadeptportal.tasks.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskActivityDTO {
    private Long activityId;
    private Long taskId;
    private Long userId;
    private String displayName;
    private String activityType;
    private String oldValue;
    private String newValue;
    private LocalDateTime activityTime;
}

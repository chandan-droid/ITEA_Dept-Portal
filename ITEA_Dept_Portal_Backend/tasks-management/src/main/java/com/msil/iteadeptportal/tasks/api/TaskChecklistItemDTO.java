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
public class TaskChecklistItemDTO {
    private Long itemId;
    private Long taskId;
    private String title;
    private Boolean completed;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
}

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
public class TaskAssigneeDTO {
    private Long userId;
    private String displayName;
    private String email;
    private String role;
    private Long assignedBy;
    private String assignedByName;
    private LocalDateTime assignedAt;
}

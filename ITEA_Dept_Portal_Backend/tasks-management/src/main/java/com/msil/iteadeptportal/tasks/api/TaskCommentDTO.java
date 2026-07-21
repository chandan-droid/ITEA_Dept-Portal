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
public class TaskCommentDTO {
    private Long commentId;
    private Long taskId;
    private Long userId;
    private String displayName;
    private String comment;
    private LocalDateTime createdAt;
}

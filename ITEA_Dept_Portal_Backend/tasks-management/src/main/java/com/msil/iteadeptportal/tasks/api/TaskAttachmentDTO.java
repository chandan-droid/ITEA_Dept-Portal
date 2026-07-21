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
public class TaskAttachmentDTO {
    private Long attachmentId;
    private Long taskId;
    private String fileName;
    private String fileType;
    private Long uploadedBy;
    private String uploaderName;
    private LocalDateTime uploadedAt;
}

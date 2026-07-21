package com.msil.iteadeptportal.tasks.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_attachments", indexes = {
    @Index(name = "idx_task_attachment_task", columnList = "task_id"),
    @Index(name = "idx_task_attachment_uploader", columnList = "uploaded_by")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attachment_id")
    private Long attachmentId;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_type", length = 100)
    private String fileType;

    /**
     * Relative path inside the "task-attachments" Supabase S3 bucket.
     * Example: "task-1/uuid-report.pdf"
     */
    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "storage_path", length = 500)
    private String storagePath;

    @Column(name = "uploaded_by", nullable = false)
    private Long uploadedBy;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    public String getStoragePath() {
        return storagePath != null ? storagePath : filePath;
    }

    public String getFilePath() {
        return filePath != null ? filePath : storagePath;
    }

    @PrePersist
    @PreUpdate
    protected void onCreate() {
        if (uploadedAt == null) {
            uploadedAt = LocalDateTime.now();
        }
        if (filePath == null && storagePath != null) {
            filePath = storagePath;
        }
        if (storagePath == null && filePath != null) {
            storagePath = filePath;
        }
    }
}

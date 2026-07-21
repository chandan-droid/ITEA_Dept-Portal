package com.msil.iteadeptportal.tasks.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks", indexes = {
    @Index(name = "idx_task_status",     columnList = "status"),
    @Index(name = "idx_task_priority",   columnList = "priority"),
    @Index(name = "idx_task_project",    columnList = "project_id"),
    @Index(name = "idx_task_created_by", columnList = "created_by"),
    @Index(name = "idx_task_due_date",   columnList = "due_date"),
    @Index(name = "idx_task_archived",   columnList = "archived")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_id")
    private Long taskId;

    @Column(name = "task_code", nullable = false, unique = true, length = 20)
    private String taskCode;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * Task status lifecycle:
     * TODO → IN_PROGRESS → UNDER_REVIEW → COMPLETED → ARCHIVED
     * Alternative: TODO → CANCELLED, IN_PROGRESS → ON_HOLD, UNDER_REVIEW → IN_PROGRESS
     */
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "TODO";

    /**
     * Priority: LOW | MEDIUM | HIGH | CRITICAL
     */
    @Column(name = "priority", nullable = false, length = 20)
    @Builder.Default
    private String priority = "MEDIUM";

    @Column(name = "category", length = 100)
    private String category;

    /**
     * Nullable — null means standalone task (not linked to any project).
     */
    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "progress_percentage", nullable = false)
    @Builder.Default
    private Integer progressPercentage = 0;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "archived", nullable = false)
    @Builder.Default
    private Boolean archived = false;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt  = LocalDateTime.now();
        updatedAt  = LocalDateTime.now();
        if (status   == null) status   = "TODO";
        if (priority == null) priority = "MEDIUM";
        if (progressPercentage == null) progressPercentage = 0;
        if (archived == null) archived = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

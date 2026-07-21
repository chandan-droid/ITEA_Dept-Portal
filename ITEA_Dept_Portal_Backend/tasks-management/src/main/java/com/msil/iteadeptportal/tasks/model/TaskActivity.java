package com.msil.iteadeptportal.tasks.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_activity_history", indexes = {
    @Index(name = "idx_task_activity_task",  columnList = "task_id"),
    @Index(name = "idx_task_activity_user",  columnList = "user_id"),
    @Index(name = "idx_task_activity_type",  columnList = "activity_type"),
    @Index(name = "idx_task_activity_time",  columnList = "activity_time")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activity_id")
    private Long activityId;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * Activity types: TASK_CREATED, TASK_UPDATED, ASSIGNEE_ADDED, ASSIGNEE_REMOVED,
     * STATUS_CHANGED, PROGRESS_UPDATED, CHECKLIST_ADDED, CHECKLIST_UPDATED,
     * CHECKLIST_COMPLETED, CHECKLIST_DELETED, COMMENT_ADDED, COMMENT_DELETED,
     * ATTACHMENT_UPLOADED, ATTACHMENT_DELETED, TASK_APPROVED, TASK_ARCHIVED, TASK_DELETED
     */
    @Column(name = "activity_type", nullable = false, length = 50)
    private String activityType;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "activity_time", nullable = false, updatable = false)
    private LocalDateTime activityTime;

    @PrePersist
    protected void onCreate() {
        activityTime = LocalDateTime.now();
    }
}

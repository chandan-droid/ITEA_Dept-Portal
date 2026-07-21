package com.msil.iteadeptportal.projects.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_activity_history", indexes = {
    @Index(name = "idx_project_activity_project", columnList = "project_id"),
    @Index(name = "idx_project_activity_user", columnList = "user_id"),
    @Index(name = "idx_project_activity_type", columnList = "activity_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activity_id")
    private Long activityId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "activity_type", nullable = false, length = 50)
    private String activityType;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "activity_time", nullable = false)
    private LocalDateTime activityTime;

    @PrePersist
    protected void onCreate() {
        activityTime = LocalDateTime.now();
    }
}

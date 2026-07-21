package com.msil.iteadeptportal.projects.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_members", 
       uniqueConstraints = @UniqueConstraint(name = "uk_project_member", columnNames = {"project_id", "user_id"}),
       indexes = {
           @Index(name = "idx_project_member_project", columnList = "project_id"),
           @Index(name = "idx_project_member_user", columnList = "user_id")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "project_member_id")
    private Long projectMemberId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "project_role", nullable = false, length = 50)
    private String projectRole; // MANAGER, TEAM_MEMBER, TESTER, etc.

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
    }
}

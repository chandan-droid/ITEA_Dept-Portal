package com.msil.iteadeptportal.projects.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectMemberDTO {
    private Long projectMemberId;
    private Long projectId;
    private Long userId;
    private String displayName;
    private String email;
    private String projectRole;
    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
}

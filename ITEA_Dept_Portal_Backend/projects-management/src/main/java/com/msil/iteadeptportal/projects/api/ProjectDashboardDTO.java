package com.msil.iteadeptportal.projects.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectDashboardDTO {
    private long totalProjects;
    private long activeProjects;
    private long completedProjects;
    private long planningProjects;
    private long overdueProjects;
    private long upcomingMilestones;
    private List<ProjectActivityDTO> recentActivities;
}

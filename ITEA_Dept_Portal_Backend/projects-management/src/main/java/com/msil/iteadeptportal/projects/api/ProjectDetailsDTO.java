package com.msil.iteadeptportal.projects.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectDetailsDTO {
    private ProjectDTO project;
    private List<ProjectMemberDTO> members;
    private ProjectStatisticsDTO statistics;
    private List<ProjectMilestoneDTO> milestones;
    private List<ProjectActivityDTO> recentActivities;
}

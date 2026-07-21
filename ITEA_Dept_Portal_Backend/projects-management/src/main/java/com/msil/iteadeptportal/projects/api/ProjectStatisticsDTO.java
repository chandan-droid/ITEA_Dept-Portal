package com.msil.iteadeptportal.projects.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectStatisticsDTO {
    private long members;
    private long tasks;
    private long completedTasks;
    private long pendingTasks;
    private int progress;
    private long milestones;
    private long completedMilestones;
}

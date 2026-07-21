package com.msil.iteadeptportal.tasks.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskDashboardDTO {
    private long totalTasks;
    private long overdueTasks;
    private double completionRate; // percentage (0–100)
    private Map<String, Long> tasksByStatus;
    private Map<String, Long> tasksByPriority;
}

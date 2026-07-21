package com.msil.iteadeptportal.tasks.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskReportDTO {
    private long totalTasks;
    private long overdueTasks;
    private double completionRate;
    private Map<String, Long> tasksByStatus;
    private Map<String, Long> tasksByPriority;
    /** userId → count of active tasks */
    private Map<Long, Long> employeeWorkload;
    /** projectId → count of tasks */
    private Map<Long, Long> projectWiseTaskSummary;
    /** Tasks overdue for >7 days (aging report) */
    private List<TaskDTO> agingTasks;
}

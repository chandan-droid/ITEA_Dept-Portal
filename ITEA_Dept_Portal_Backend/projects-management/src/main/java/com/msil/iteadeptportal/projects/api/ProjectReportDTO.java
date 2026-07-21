package com.msil.iteadeptportal.projects.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectReportDTO {
    private ProjectDTO summary;
    private List<ProjectMemberDTO> members;
    private int progress;
    private List<ProjectMilestoneDTO> milestones;
    private List<String> tasks;
    private TimelineDTO timeline;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TimelineDTO {
        private LocalDate plannedStartDate;
        private LocalDate plannedEndDate;
        private LocalDate actualStartDate;
        private LocalDate actualEndDate;
    }
}

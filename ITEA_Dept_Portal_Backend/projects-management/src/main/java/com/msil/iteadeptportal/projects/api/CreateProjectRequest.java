package com.msil.iteadeptportal.projects.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateProjectRequest {
    private String projectName;
    private String description;
    private String objectives;
    private Long ownerId;
    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;
}

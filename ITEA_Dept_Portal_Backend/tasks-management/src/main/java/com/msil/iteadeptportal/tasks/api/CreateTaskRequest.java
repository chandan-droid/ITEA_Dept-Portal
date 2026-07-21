package com.msil.iteadeptportal.tasks.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTaskRequest {
    private String title;           // required
    private String description;
    private String priority;        // LOW | MEDIUM | HIGH | CRITICAL  (default MEDIUM)
    private String category;
    private Long projectId;         // null → standalone task
    private List<Long> assigneeIds; // optional initial assignees
    private LocalDate startDate;
    private LocalDate dueDate;
}

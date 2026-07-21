package com.msil.iteadeptportal.tasks.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTaskRequest {
    private String title;
    private String description;
    private String priority;
    private String category;
    private LocalDate startDate;
    private LocalDate dueDate;
}

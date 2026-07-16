package com.msil.iteadeptportal.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "wfh_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WfhRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wfh_request_id")
    private Long wfhRequestId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "wfh_date", nullable = false)
    private LocalDate wfhDate;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    /** PENDING, APPROVED, REJECTED */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

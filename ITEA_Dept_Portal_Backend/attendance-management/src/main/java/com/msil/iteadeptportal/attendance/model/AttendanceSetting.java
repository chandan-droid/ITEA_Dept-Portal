package com.msil.iteadeptportal.attendance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "attendance_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "setting_id")
    private Long settingId;

    @Column(name = "office_start_time", nullable = false)
    private LocalTime officeStartTime;

    @Column(name = "office_end_time", nullable = false)
    private LocalTime officeEndTime;

    @Column(name = "grace_period_minutes", nullable = false)
    @Builder.Default
    private Integer gracePeriodMinutes = 15;

    @Column(name = "minimum_half_day_minutes", nullable = false)
    private Integer minimumHalfDayMinutes;

    @Column(name = "minimum_full_day_minutes", nullable = false)
    private Integer minimumFullDayMinutes;

    @Column(name = "auto_checkout", nullable = false)
    @Builder.Default
    private Boolean autoCheckout = false;

    @Column(name = "allow_remote_checkin", nullable = false)
    @Builder.Default
    private Boolean allowRemoteCheckin = false;

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

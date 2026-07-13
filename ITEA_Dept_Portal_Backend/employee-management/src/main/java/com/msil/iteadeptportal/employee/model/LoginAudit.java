package com.msil.iteadeptportal.employee.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "login_audit")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "login_audit_id")
    private Long loginAuditId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "jwt_id")
    private UUID jwtId;

    @Column(name = "login_time", nullable = false, updatable = false)
    private LocalDateTime loginTime;

    @Column(name = "logout_time")
    private LocalDateTime logoutTime;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "authentication_status")
    private String authenticationStatus; // SUCCESS, FAILED

    @Column(name = "failure_reason")
    private String failureReason;

    @PrePersist
    protected void onCreate() {
        loginTime = LocalDateTime.now();
    }
}

package com.msil.iteadeptportal.employee.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "employee_id", nullable = false, unique = true)
    private String employeeId;

    @Column(name = "sam_account_name", nullable = false, unique = true)
    private String samAccountName;

    @Column(name = "user_principal_name", nullable = false, unique = true)
    private String userPrincipalName;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "surname")
    private String surname;

    @Column(name = "email")
    private String email;

    @Column(name = "status", nullable = false)
    private String status; // ACTIVE, INACTIVE, LOCKED

    @Column(name = "first_login", nullable = false)
    private Boolean firstLogin;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = "ACTIVE";
        }
        if (firstLogin == null) {
            firstLogin = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

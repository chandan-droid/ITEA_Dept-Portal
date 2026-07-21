package com.msil.iteadeptportal.attendance.repository;

import com.msil.iteadeptportal.attendance.model.AttendanceNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceNotificationRepository extends JpaRepository<AttendanceNotification, Long> {
    List<AttendanceNotification> findByUserIdAndIsReadOrderByCreatedAtDesc(Long userId, boolean isRead);
    Page<AttendanceNotification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}

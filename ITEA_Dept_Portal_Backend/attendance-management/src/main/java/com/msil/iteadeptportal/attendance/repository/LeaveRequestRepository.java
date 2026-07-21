package com.msil.iteadeptportal.attendance.repository;

import com.msil.iteadeptportal.attendance.model.LeaveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    Page<LeaveRequest> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    List<LeaveRequest> findByUserId(Long userId);
    List<LeaveRequest> findByUserIdAndStatus(Long userId, String status);
    List<LeaveRequest> findByStatus(String status);
}

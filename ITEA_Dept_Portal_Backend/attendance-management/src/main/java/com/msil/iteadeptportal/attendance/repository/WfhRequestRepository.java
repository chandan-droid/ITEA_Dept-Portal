package com.msil.iteadeptportal.attendance.repository;

import com.msil.iteadeptportal.attendance.model.WfhRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WfhRequestRepository extends JpaRepository<WfhRequest, Long> {
    Page<WfhRequest> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    List<WfhRequest> findByStatus(String status);
}

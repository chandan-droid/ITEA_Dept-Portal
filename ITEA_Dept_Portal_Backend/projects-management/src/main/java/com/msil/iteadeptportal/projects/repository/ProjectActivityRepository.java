package com.msil.iteadeptportal.projects.repository;

import com.msil.iteadeptportal.projects.model.ProjectActivity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectActivityRepository extends JpaRepository<ProjectActivity, Long> {

    List<ProjectActivity> findByProjectIdOrderByActivityTimeDesc(Long projectId);
    
    @Query("SELECT pa FROM ProjectActivity pa ORDER BY pa.activityTime DESC")
    List<ProjectActivity> findRecentActivities(Pageable pageable);
}

package com.msil.iteadeptportal.projects.repository;

import com.msil.iteadeptportal.projects.model.ProjectMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ProjectMilestoneRepository extends JpaRepository<ProjectMilestone, Long> {

    List<ProjectMilestone> findByProjectId(Long projectId);
    
    long countByProjectId(Long projectId);
    
    long countByProjectIdAndStatus(Long projectId, String status);

    @Query("SELECT COUNT(pm) FROM ProjectMilestone pm WHERE pm.status IN ('PENDING', 'IN_PROGRESS') AND pm.targetDate > :today")
    long countUpcomingMilestones(@Param("today") LocalDate today);
}

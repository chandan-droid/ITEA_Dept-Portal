package com.msil.iteadeptportal.projects.repository;

import com.msil.iteadeptportal.projects.model.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    Optional<Project> findByProjectCode(String projectCode);

    boolean existsByProjectName(String projectName);

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Project p WHERE p.projectName = :projectName AND p.projectId <> :projectId")
    boolean existsByProjectNameAndProjectIdNot(@Param("projectName") String projectName, @Param("projectId") Long projectId);

    @Query("SELECT p FROM Project p WHERE p.projectId IN " +
           "(SELECT pm.projectId FROM ProjectMember pm WHERE pm.userId = :userId AND pm.leftAt IS NULL) " +
           "AND (cast(:status as string) IS NULL OR p.status = :status) " +
           "AND (cast(:search as string) IS NULL OR LOWER(p.projectName) LIKE LOWER(CONCAT('%', cast(:search as string), '%')))")
    Page<Project> findMyProjects(@Param("userId") Long userId, 
                                 @Param("status") String status, 
                                 @Param("search") String search, 
                                 Pageable pageable);

    @Query("SELECT p FROM Project p WHERE " +
           "(cast(:search as string) IS NULL OR LOWER(p.projectName) LIKE LOWER(CONCAT('%', cast(:search as string), '%')) OR LOWER(p.projectCode) LIKE LOWER(CONCAT('%', cast(:search as string), '%'))) " +
           "AND (:ownerId IS NULL OR p.ownerId = :ownerId) " +
           "AND (cast(:status as string) IS NULL OR p.status = :status) " +
           "AND (cast(:startDate as localdate) IS NULL OR p.plannedStartDate >= :startDate) " +
           "AND (cast(:endDate as localdate) IS NULL OR p.plannedEndDate <= :endDate)")
    Page<Project> searchProjects(@Param("search") String search,
                                 @Param("ownerId") Long ownerId,
                                 @Param("status") String status,
                                 @Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate,
                                 Pageable pageable);
    
    long countByStatus(String status);

    @Query("SELECT COUNT(p) FROM Project p WHERE p.status IN ('ACTIVE', 'PLANNING') AND p.plannedEndDate < :today")
    long countOverdueProjects(@Param("today") LocalDate today);
}

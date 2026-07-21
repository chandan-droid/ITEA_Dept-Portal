package com.msil.iteadeptportal.tasks.repository;

import com.msil.iteadeptportal.tasks.model.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    /**
     * Returns tasks assigned to the given user (via task_assignees), with optional filters.
     */
    @Query("SELECT t FROM Task t WHERE t.taskId IN " +
           "(SELECT a.taskId FROM TaskAssignee a WHERE a.userId = :userId) " +
           "AND (:archived IS NULL OR t.archived = :archived) " +
           "AND (cast(:status as string) IS NULL OR t.status = :status) " +
           "AND (cast(:priority as string) IS NULL OR t.priority = :priority) " +
           "AND (cast(:category as string) IS NULL OR LOWER(t.category) = LOWER(cast(:category as string))) " +
           "AND (:projectId IS NULL OR t.projectId = :projectId) " +
           "AND (cast(:search as string) IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', cast(:search as string), '%'))) " +
           "AND (cast(:dueDate as localdate) IS NULL OR t.dueDate <= :dueDate) " +
           "AND (:overdue IS NULL OR (:overdue = true AND t.dueDate < CURRENT_DATE AND t.status NOT IN ('COMPLETED','APPROVED','ARCHIVED','CANCELLED')))")
    Page<Task> findMyTasks(@Param("userId")    Long userId,
                           @Param("status")    String status,
                           @Param("priority")  String priority,
                           @Param("category")  String category,
                           @Param("projectId") Long projectId,
                           @Param("search")    String search,
                           @Param("dueDate")   LocalDate dueDate,
                           @Param("archived")  Boolean archived,
                           @Param("overdue")   Boolean overdue,
                           Pageable pageable);

    /**
     * Searches all tasks — for managers/admins with full access.
     */
    @Query("SELECT t FROM Task t WHERE " +
           "(cast(:search as string) IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', cast(:search as string), '%'))) " +
           "AND (cast(:status as string) IS NULL OR t.status = :status) " +
           "AND (cast(:priority as string) IS NULL OR t.priority = :priority) " +
           "AND (cast(:category as string) IS NULL OR LOWER(t.category) = LOWER(cast(:category as string))) " +
           "AND (:projectId IS NULL OR t.projectId = :projectId) " +
           "AND (:assigneeId IS NULL OR t.taskId IN (SELECT a.taskId FROM TaskAssignee a WHERE a.userId = :assigneeId)) " +
           "AND (:createdBy IS NULL OR t.createdBy = :createdBy) " +
           "AND (cast(:startDate as localdate) IS NULL OR t.startDate >= :startDate) " +
           "AND (cast(:dueDate as localdate) IS NULL OR t.dueDate <= :dueDate) " +
           "AND (:archived IS NULL OR t.archived = :archived) " +
           "AND (:overdue IS NULL OR (:overdue = true AND t.dueDate < CURRENT_DATE AND t.status NOT IN ('COMPLETED','APPROVED','ARCHIVED','CANCELLED')))")
    Page<Task> searchTasks(@Param("search")     String search,
                           @Param("status")     String status,
                           @Param("priority")   String priority,
                           @Param("category")   String category,
                           @Param("projectId")  Long projectId,
                           @Param("assigneeId") Long assigneeId,
                           @Param("createdBy")  Long createdBy,
                           @Param("startDate")  LocalDate startDate,
                           @Param("dueDate")    LocalDate dueDate,
                           @Param("archived")   Boolean archived,
                           @Param("overdue")    Boolean overdue,
                           Pageable pageable);

    long countByStatus(String status);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.dueDate < :today " +
           "AND t.status NOT IN ('COMPLETED', 'APPROVED', 'ARCHIVED', 'CANCELLED')")
    long countOverdueTasks(@Param("today") LocalDate today);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.projectId = :projectId")
    long countByProjectId(@Param("projectId") Long projectId);
}

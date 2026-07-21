package com.msil.iteadeptportal.tasks.repository;

import com.msil.iteadeptportal.tasks.model.TaskActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskActivityRepository extends JpaRepository<TaskActivity, Long> {

    List<TaskActivity> findByTaskIdOrderByActivityTimeDesc(Long taskId);

    void deleteByTaskId(Long taskId);

    /**
     * Global activity feed — for managers/admins viewing the full organization log.
     */
    @Query("SELECT a FROM TaskActivity a WHERE " +
           "(:taskId IS NULL OR a.taskId = :taskId) " +
           "AND (:userId IS NULL OR a.userId = :userId) " +
           "AND (cast(:activityType as string) IS NULL OR a.activityType = :activityType) " +
           "ORDER BY a.activityTime DESC")
    Page<TaskActivity> findActivities(@Param("taskId")       Long taskId,
                                      @Param("userId")       Long userId,
                                      @Param("activityType") String activityType,
                                      Pageable pageable);
}

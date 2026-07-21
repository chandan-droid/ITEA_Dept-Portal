package com.msil.iteadeptportal.tasks.repository;

import com.msil.iteadeptportal.tasks.model.TaskAssignee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskAssigneeRepository extends JpaRepository<TaskAssignee, Long> {

    List<TaskAssignee> findByTaskId(Long taskId);

    boolean existsByTaskIdAndUserId(Long taskId, Long userId);

    void deleteByTaskIdAndUserId(Long taskId, Long userId);

    void deleteByTaskId(Long taskId);

    @Query("SELECT a.taskId FROM TaskAssignee a WHERE a.userId = :userId")
    List<Long> findTaskIdsByUserId(@Param("userId") Long userId);

    long countByUserId(Long userId);
}

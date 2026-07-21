package com.msil.iteadeptportal.tasks.repository;

import com.msil.iteadeptportal.tasks.model.TaskChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskChecklistRepository extends JpaRepository<TaskChecklist, Long> {

    List<TaskChecklist> findByTaskIdOrderByCreatedAtAsc(Long taskId);

    void deleteByTaskId(Long taskId);

    long countByTaskId(Long taskId);

    long countByTaskIdAndIsCompleted(Long taskId, boolean isCompleted);
}

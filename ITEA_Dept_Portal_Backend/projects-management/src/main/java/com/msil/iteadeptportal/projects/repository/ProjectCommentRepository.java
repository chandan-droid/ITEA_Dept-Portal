package com.msil.iteadeptportal.projects.repository;

import com.msil.iteadeptportal.projects.model.ProjectComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectCommentRepository extends JpaRepository<ProjectComment, Long> {

    List<ProjectComment> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}

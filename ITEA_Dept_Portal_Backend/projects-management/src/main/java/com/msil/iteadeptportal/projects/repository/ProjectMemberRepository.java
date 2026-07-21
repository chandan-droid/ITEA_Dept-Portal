package com.msil.iteadeptportal.projects.repository;

import com.msil.iteadeptportal.projects.model.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    List<ProjectMember> findByProjectIdAndLeftAtIsNull(Long projectId);

    boolean existsByProjectIdAndUserIdAndLeftAtIsNull(Long projectId, Long userId);

    Optional<ProjectMember> findByProjectIdAndUserIdAndLeftAtIsNull(Long projectId, Long userId);
    
    long countByProjectIdAndLeftAtIsNull(Long projectId);
}

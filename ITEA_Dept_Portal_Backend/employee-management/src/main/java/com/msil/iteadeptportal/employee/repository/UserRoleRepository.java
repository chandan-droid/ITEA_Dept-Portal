package com.msil.iteadeptportal.employee.repository;

import com.msil.iteadeptportal.employee.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {
    Optional<UserRole> findByUserIdAndRoleId(Long userId, Long roleId);
    List<UserRole> findByUserId(Long userId);
}

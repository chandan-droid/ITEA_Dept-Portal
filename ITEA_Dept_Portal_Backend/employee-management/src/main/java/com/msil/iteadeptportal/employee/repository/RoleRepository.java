package com.msil.iteadeptportal.employee.repository;

import com.msil.iteadeptportal.employee.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByRoleName(String roleName);

    @Query("SELECT r FROM Role r WHERE r.roleId IN (" +
           "SELECT ur.roleId FROM UserRole ur WHERE ur.userId = :userId)")
    List<Role> findRolesByUserId(@Param("userId") Long userId);
}

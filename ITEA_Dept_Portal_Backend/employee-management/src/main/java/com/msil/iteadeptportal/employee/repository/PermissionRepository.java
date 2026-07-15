package com.msil.iteadeptportal.employee.repository;

import com.msil.iteadeptportal.employee.model.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {

    @Query("SELECT p FROM Permission p WHERE p.permissionId IN (" +
           "SELECT rp.permissionId FROM RolePermission rp WHERE rp.roleId IN (" +
           "SELECT ur.roleId FROM UserRole ur WHERE ur.userId = :userId))")
    List<Permission> findPermissionsByUserId(@Param("userId") Long userId);

    @Query("SELECT p FROM Permission p WHERE p.permissionId IN (" +
           "SELECT rp.permissionId FROM RolePermission rp WHERE rp.roleId IN :roleIds)")
    List<Permission> findPermissionsByRoleIds(@Param("roleIds") List<Long> roleIds);
}

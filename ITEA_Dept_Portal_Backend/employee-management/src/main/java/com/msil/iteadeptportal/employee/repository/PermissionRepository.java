package com.msil.iteadeptportal.employee.repository;

import com.msil.iteadeptportal.employee.model.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {
}

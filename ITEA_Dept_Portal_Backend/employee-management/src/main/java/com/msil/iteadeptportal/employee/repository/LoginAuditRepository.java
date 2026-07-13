package com.msil.iteadeptportal.employee.repository;

import com.msil.iteadeptportal.employee.model.LoginAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LoginAuditRepository extends JpaRepository<LoginAudit, Long> {
}

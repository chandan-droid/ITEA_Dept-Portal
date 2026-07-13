package com.msil.iteadeptportal.employee.repository;

import com.msil.iteadeptportal.employee.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findBySamAccountName(String samAccountName);
}

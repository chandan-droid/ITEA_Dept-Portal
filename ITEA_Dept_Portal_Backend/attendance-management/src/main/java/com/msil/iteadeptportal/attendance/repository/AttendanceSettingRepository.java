package com.msil.iteadeptportal.attendance.repository;

import com.msil.iteadeptportal.attendance.model.AttendanceSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AttendanceSettingRepository extends JpaRepository<AttendanceSetting, Long> {
}

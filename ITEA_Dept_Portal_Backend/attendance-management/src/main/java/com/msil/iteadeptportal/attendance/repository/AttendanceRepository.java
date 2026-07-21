package com.msil.iteadeptportal.attendance.repository;

import com.msil.iteadeptportal.attendance.model.AttendanceRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {

    Optional<AttendanceRecord> findByUserIdAndAttendanceDate(Long userId, LocalDate date);

    List<AttendanceRecord> findByAttendanceDate(LocalDate date);

    List<AttendanceRecord> findByUserIdAndAttendanceDateBetween(Long userId, LocalDate fromDate, LocalDate toDate);

    Page<AttendanceRecord> findByUserIdAndAttendanceDateBetween(
            Long userId, LocalDate fromDate, LocalDate toDate, Pageable pageable);

    Page<AttendanceRecord> findByUserId(Long userId, Pageable pageable);

    /**
     * Cross-table search for team/admin use. Joins attendance_records with users.
     * Returns a projection with user info enriched.
     */
    @Query(value = """
            SELECT a.attendance_id   AS attendanceId,
                   u.employee_id     AS employeeId,
                   u.display_name    AS displayName,
                   a.attendance_date AS attendanceDate,
                   a.attendance_status AS attendanceStatus,
                   a.working_minutes AS workingMinutes
            FROM attendance_records a
            JOIN users u ON a.user_id = u.user_id
            WHERE (CAST(:status AS varchar) IS NULL OR a.attendance_status = :status)
              AND (:fromDate  IS NULL OR a.attendance_date >= CAST(:fromDate  AS date))
              AND (:toDate    IS NULL OR a.attendance_date <= CAST(:toDate    AS date))
              AND (CAST(:search AS varchar) IS NULL
                   OR u.employee_id  ILIKE '%' || :search || '%'
                   OR u.display_name ILIKE '%' || :search || '%')
            ORDER BY a.attendance_date DESC, u.display_name ASC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM attendance_records a
            JOIN users u ON a.user_id = u.user_id
            WHERE (CAST(:status AS varchar) IS NULL OR a.attendance_status = :status)
              AND (:fromDate  IS NULL OR a.attendance_date >= CAST(:fromDate  AS date))
              AND (:toDate    IS NULL OR a.attendance_date <= CAST(:toDate    AS date))
              AND (CAST(:search AS varchar) IS NULL
                   OR u.employee_id  ILIKE '%' || :search || '%'
                   OR u.display_name ILIKE '%' || :search || '%')
            """,
            nativeQuery = true)
    Page<AttendanceSearchProjection> searchWithUserInfo(
            @Param("status") String status,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate,
            @Param("search") String search,
            Pageable pageable);

    /**
     * Team attendance for a specific date — LEFT JOIN so absent employees appear too.
     */
    @Query(value = """
            SELECT u.employee_id  AS employeeId,
                   u.display_name AS displayName,
                   COALESCE(a.attendance_status, 'ABSENT') AS status,
                   TO_CHAR(a.check_in_time, 'HH24:MI') AS checkInTime,
                   TO_CHAR(a.check_out_time, 'HH24:MI') AS checkOutTime,
                   a.working_minutes AS workingMinutes
            FROM users u
            LEFT JOIN attendance_records a
               ON a.user_id = u.user_id AND a.attendance_date = CAST(:date AS date)
            WHERE u.status = 'ACTIVE'
            ORDER BY u.display_name ASC
            """,
            nativeQuery = true)
    List<TeamAttendanceProjection> getTeamAttendance(@Param("date") String date);

    /**
     * Aggregate attendance counts grouped by status for a user in a date range.
     */
    @Query(value = """
            SELECT a.attendance_status AS status, COUNT(*) AS cnt
            FROM attendance_records a
            WHERE a.user_id = :userId
              AND a.attendance_date >= CAST(:fromDate AS date)
              AND a.attendance_date <= CAST(:toDate   AS date)
            GROUP BY a.attendance_status
            """,
            nativeQuery = true)
    List<AttendanceCountProjection> countByStatusForUser(
            @Param("userId") Long userId,
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);

    /**
     * Sum of working_minutes for a user over a date range.
     */
    @Query("SELECT COALESCE(SUM(a.workingMinutes), 0) FROM AttendanceRecord a " +
           "WHERE a.userId = :userId AND a.attendanceDate >= :fromDate AND a.attendanceDate <= :toDate")
    Long sumWorkingMinutes(
            @Param("userId") Long userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    /**
     * Team report aggregated by employee for a date range.
     */
    @Query(value = """
            SELECT u.employee_id    AS employeeId,
                   u.display_name   AS displayName,
                   COUNT(CASE WHEN a.attendance_status = 'PRESENT'  THEN 1 END) AS presentCount,
                   COUNT(CASE WHEN a.attendance_status = 'ABSENT'   THEN 1 END) AS absentCount,
                   COUNT(CASE WHEN a.attendance_status = 'LEAVE'    THEN 1 END) AS leaveCount,
                   COUNT(CASE WHEN a.attendance_status = 'WFH'      THEN 1 END) AS wfhCount,
                   COUNT(CASE WHEN a.attendance_status = 'HALF_DAY' THEN 1 END) AS halfDayCount,
                   COALESCE(SUM(a.working_minutes), 0)                          AS totalWorkingMinutes
            FROM users u
            LEFT JOIN attendance_records a
               ON a.user_id = u.user_id
              AND a.attendance_date >= CAST(:fromDate AS date)
              AND a.attendance_date <= CAST(:toDate   AS date)
            WHERE u.status = 'ACTIVE'
            GROUP BY u.employee_id, u.display_name
            ORDER BY u.display_name ASC
            """,
            nativeQuery = true)
    List<TeamReportProjection> getTeamReport(
            @Param("fromDate") String fromDate,
            @Param("toDate") String toDate);
}

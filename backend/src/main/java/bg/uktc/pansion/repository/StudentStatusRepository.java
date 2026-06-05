package bg.uktc.pansion.repository;

import bg.uktc.pansion.domain.entity.StudentStatus;
import bg.uktc.pansion.domain.enums.ApprovalStatus;
import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.repository.projection.DailySummaryRow;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StudentStatusRepository extends JpaRepository<StudentStatus, Long> {

    boolean existsByStudentIdAndApprovalStatus(Long studentId, ApprovalStatus approvalStatus);

    /** Latest meaningful status of a student (the value the UI treats as "current"). */
    @Query("""
            select s from StudentStatus s
            where s.student.id = :studentId
              and (s.status = bg.uktc.pansion.domain.enums.EnrollmentStatus.ENROLLED
                   or s.approvalStatus = bg.uktc.pansion.domain.enums.ApprovalStatus.APPROVED)
            order by s.timestamp desc
            """)
    List<StudentStatus> findEffectiveStatuses(@Param("studentId") Long studentId, Limit limit);

    @Query("""
            select s from StudentStatus s
            left join fetch s.approvedBy
            where s.student.id = :studentId
            order by s.timestamp desc
            """)
    List<StudentStatus> findHistory(@Param("studentId") Long studentId, Limit limit);

    @Query("""
            select s from StudentStatus s
            join fetch s.student u
            where s.approvalStatus = bg.uktc.pansion.domain.enums.ApprovalStatus.PENDING
              and s.status = bg.uktc.pansion.domain.enums.EnrollmentStatus.UNENROLLED
              and (:dormitory is null or u.dormitory = :dormitory)
            order by s.timestamp asc
            """)
    List<StudentStatus> findPendingRequests(@Param("dormitory") Dormitory dormitory);

    @Query("""
            select s from StudentStatus s
            join fetch s.student
            where s.id = :id
            """)
    Optional<StudentStatus> findByIdWithStudent(@Param("id") Long id);

    List<StudentStatus> findByStudentIdAndTimestampBetweenOrderByTimestampDesc(
            Long studentId, Instant start, Instant end);

    /** Most recent status per student within a time window (staff weekly board). */
    @Query(value = """
            SELECT ss.* FROM student_status ss
            INNER JOIN (
                SELECT student_id, MAX(timestamp) AS latest_time
                FROM student_status
                WHERE timestamp BETWEEN :start AND :end
                GROUP BY student_id
            ) latest ON ss.student_id = latest.student_id AND ss.timestamp = latest.latest_time
            INNER JOIN users u ON u.id = ss.student_id
            WHERE (:dormitory IS NULL OR u.dormitory = :dormitory)
            ORDER BY ss.timestamp DESC
            """, nativeQuery = true)
    List<StudentStatus> findLatestPerStudentInRange(
            @Param("start") Instant start,
            @Param("end") Instant end,
            @Param("dormitory") String dormitory);

    @Query(value = """
            SELECT DATE(ss.timestamp) AS day,
                   SUM(CASE WHEN ss.status = 'enrolled' THEN 1 ELSE 0 END) AS enrolledCount,
                   SUM(CASE WHEN ss.status = 'unenrolled' AND ss.approval_status = 'approved' THEN 1 ELSE 0 END) AS unenrolledCount,
                   SUM(CASE WHEN ss.approval_status = 'pending' THEN 1 ELSE 0 END) AS pendingCount
            FROM student_status ss
            WHERE DATE(ss.timestamp) BETWEEN :start AND :end
            GROUP BY DATE(ss.timestamp)
            ORDER BY DATE(ss.timestamp) ASC
            """, nativeQuery = true)
    List<DailySummaryRow> findMonthlySummary(@Param("start") LocalDate start, @Param("end") LocalDate end);
}

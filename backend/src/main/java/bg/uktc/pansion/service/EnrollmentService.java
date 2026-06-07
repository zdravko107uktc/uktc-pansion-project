package bg.uktc.pansion.service;

import bg.uktc.pansion.domain.entity.StudentStatus;
import bg.uktc.pansion.repository.projection.OccupancyRow;
import bg.uktc.pansion.service.command.StatusChangeCommand;

import java.time.LocalDate;
import java.util.List;

/** Student check-in/out and the staff review workflow for unenrollment requests. */
public interface EnrollmentService {

    String submitStatusChange(Long studentId, StatusChangeCommand command);

    String reviewRequest(Long staffUserId, Long statusId, boolean approve, String reviewSignature);

    /**
     * Approve or reject several pending requests in one call. Requests that are no longer pending, or
     * that belong to another dormitory than a counselor's own, are skipped rather than failing the batch.
     */
    BulkReviewOutcome bulkReview(Long staffUserId, List<Long> statusIds, boolean approve, String reviewSignature);

    List<StudentStatus> getHistory(Long studentId, int limit);

    List<StudentStatus> getWeekRecords(Long staffUserId);

    List<StudentStatus> getPendingRequests(Long staffUserId);

    List<StudentStatus> getStudentAttendanceForMonth(Long studentId, LocalDate start, LocalDate end);

    /**
     * Live occupancy grouped by dormitory. Counselors are restricted to their own dormitory;
     * admins see every dormitory.
     */
    List<OccupancyRow> getOccupancy(Long staffUserId);

    /**
     * Student roster with each student's current status. Counselors see only their own dormitory;
     * admins see every student.
     */
    List<RosterEntry> getRoster(Long staffUserId);
}

package bg.uktc.pansion.service;

import bg.uktc.pansion.domain.entity.StudentStatus;
import bg.uktc.pansion.service.command.StatusChangeCommand;

import java.time.LocalDate;
import java.util.List;

/** Student check-in/out and the staff review workflow for unenrollment requests. */
public interface EnrollmentService {

    String submitStatusChange(Long studentId, StatusChangeCommand command);

    String reviewRequest(Long staffUserId, Long statusId, boolean approve, String reviewSignature);

    List<StudentStatus> getHistory(Long studentId, int limit);

    List<StudentStatus> getWeekRecords(Long staffUserId);

    List<StudentStatus> getPendingRequests(Long staffUserId);

    List<StudentStatus> getStudentAttendanceForMonth(Long studentId, LocalDate start, LocalDate end);
}

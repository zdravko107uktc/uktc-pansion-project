package bg.uktc.pansion.web.mapper;

import bg.uktc.pansion.domain.entity.CalendarEvent;
import bg.uktc.pansion.domain.entity.EmailNotification;
import bg.uktc.pansion.domain.entity.StudentStatus;
import bg.uktc.pansion.domain.entity.User;
import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.domain.enums.Role;
import bg.uktc.pansion.repository.projection.DailySummaryRow;
import bg.uktc.pansion.repository.projection.OccupancyRow;
import bg.uktc.pansion.service.CalendarSnapshot;
import bg.uktc.pansion.service.NotificationFeedItem;
import bg.uktc.pansion.web.dto.response.AttendanceResponse;
import bg.uktc.pansion.web.dto.response.CalendarDataResponse;
import bg.uktc.pansion.web.dto.response.CalendarEventResponse;
import bg.uktc.pansion.web.dto.response.DailySummaryResponse;
import bg.uktc.pansion.web.dto.response.HistoryEntryResponse;
import bg.uktc.pansion.web.dto.response.NotificationFeedItemResponse;
import bg.uktc.pansion.web.dto.response.NotificationResponse;
import bg.uktc.pansion.web.dto.response.OccupancySummaryResponse;
import bg.uktc.pansion.web.dto.response.PendingRequestResponse;
import bg.uktc.pansion.web.dto.response.UserResponse;
import bg.uktc.pansion.web.dto.response.WeekRecordResponse;

import java.util.List;

/**
 * Pure entity-to-DTO translation. Stateless static methods keep the mapping responsibility isolated
 * from controllers and services (SRP).
 */
public final class ApiMapper {

    private ApiMapper() {
    }

    public static UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                value(user.getRole()),
                value(user.getDormitory()),
                user.isEmailVerified(),
                user.getCreatedAt());
    }

    public static HistoryEntryResponse toHistoryEntry(StudentStatus status) {
        User reviewer = status.getApprovedBy();
        return new HistoryEntryResponse(
                value(status.getStatus()),
                status.getLocation(),
                status.getSignature(),
                status.getReviewSignature(),
                value(status.getApprovalStatus()),
                status.getApprovedAt(),
                status.getTimestamp(),
                reviewer == null ? null : reviewer.getFullName(),
                reviewer == null ? null : value(reviewer.getRole()));
    }

    public static WeekRecordResponse toWeekRecord(StudentStatus status) {
        User student = status.getStudent();
        return new WeekRecordResponse(
                student.getId(),
                status.getId(),
                student.getFullName(),
                student.getEmail(),
                value(student.getDormitory()),
                value(status.getStatus()),
                status.getTimestamp(),
                status.getLocation(),
                status.getSignature(),
                value(status.getApprovalStatus()));
    }

    public static PendingRequestResponse toPendingRequest(StudentStatus status) {
        User student = status.getStudent();
        return new PendingRequestResponse(
                status.getId(),
                student.getId(),
                student.getFullName(),
                student.getEmail(),
                value(student.getDormitory()),
                status.getLocation(),
                status.getSignature(),
                status.getReviewSignature(),
                status.getTimestamp());
    }

    public static CalendarEventResponse toEvent(CalendarEvent event) {
        return new CalendarEventResponse(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getEventDate(),
                event.getEndDate(),
                event.getCreatedAt(),
                event.getCreatedBy() == null ? null : event.getCreatedBy().getFullName());
    }

    public static DailySummaryResponse toSummary(DailySummaryRow row) {
        return new DailySummaryResponse(
                row.getDay(), row.getEnrolledCount(), row.getUnenrolledCount(), row.getPendingCount());
    }

    public static AttendanceResponse toAttendance(StudentStatus status) {
        return new AttendanceResponse(
                status.getId(),
                value(status.getStatus()),
                status.getLocation(),
                status.getSignature(),
                value(status.getApprovalStatus()),
                status.getApprovedAt(),
                status.getTimestamp());
    }

    public static NotificationResponse toNotification(EmailNotification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getRecipientEmail(),
                notification.getSubject(),
                notification.getEventType(),
                value(notification.getStatus()),
                notification.getErrorMessage(),
                notification.getCreatedAt());
    }

    public static CalendarDataResponse toCalendarData(CalendarSnapshot snapshot) {
        List<CalendarEventResponse> events = snapshot.events().stream().map(ApiMapper::toEvent).toList();
        List<DailySummaryResponse> summary = snapshot.dailySummary() == null ? null
                : snapshot.dailySummary().stream().map(ApiMapper::toSummary).toList();
        List<AttendanceResponse> attendance = snapshot.attendance() == null ? null
                : snapshot.attendance().stream().map(ApiMapper::toAttendance).toList();
        return new CalendarDataResponse(
                snapshot.month(), events, snapshot.canManageEvents(), summary, attendance);
    }

    public static NotificationFeedItemResponse toFeedItem(NotificationFeedItem item) {
        return new NotificationFeedItemResponse(
                item.id(), item.type(), item.severity(), item.title(), item.message(), item.createdAt());
    }

    public static OccupancySummaryResponse toOccupancySummary(List<OccupancyRow> rows) {
        List<OccupancySummaryResponse.DormitoryOccupancy> dormitories = rows.stream()
                .map(ApiMapper::toDormitoryOccupancy)
                .toList();
        long total = dormitories.stream().mapToLong(OccupancySummaryResponse.DormitoryOccupancy::total).sum();
        long enrolled = dormitories.stream().mapToLong(OccupancySummaryResponse.DormitoryOccupancy::enrolled).sum();
        long away = dormitories.stream().mapToLong(OccupancySummaryResponse.DormitoryOccupancy::away).sum();
        long pending = dormitories.stream().mapToLong(OccupancySummaryResponse.DormitoryOccupancy::pending).sum();
        long unknown = dormitories.stream().mapToLong(OccupancySummaryResponse.DormitoryOccupancy::unknown).sum();
        return new OccupancySummaryResponse(total, enrolled, away, pending, unknown, dormitories);
    }

    private static OccupancySummaryResponse.DormitoryOccupancy toDormitoryOccupancy(OccupancyRow row) {
        long unknown = row.getTotalCount() - row.getEnrolledCount() - row.getAwayCount() - row.getPendingCount();
        return new OccupancySummaryResponse.DormitoryOccupancy(
                row.getDormitory(),
                row.getTotalCount(),
                row.getEnrolledCount(),
                row.getAwayCount(),
                row.getPendingCount(),
                Math.max(0, unknown));
    }

    private static String value(Role role) {
        return role == null ? null : role.getValue();
    }

    private static String value(Dormitory dormitory) {
        return dormitory == null ? null : dormitory.getValue();
    }

    private static String value(bg.uktc.pansion.domain.enums.PersistableEnum persistable) {
        return persistable == null ? null : persistable.getValue();
    }
}

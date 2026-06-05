package bg.uktc.pansion.notification.event;

import bg.uktc.pansion.domain.enums.Dormitory;

import java.util.List;

/** Published when a student submits an unenrollment request awaiting staff review. */
public record UnenrollmentRequestedEvent(
        String studentEmail,
        String fullName,
        Dormitory dormitory,
        String location,
        List<String> staffEmails
) {
}

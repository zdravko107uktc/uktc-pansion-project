package bg.uktc.pansion.notification.event;

import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.domain.enums.Role;

import java.util.List;

/** Published when staff approve or reject an unenrollment request. */
public record UnenrollmentReviewedEvent(
        String studentEmail,
        String studentName,
        Dormitory dormitory,
        String location,
        String reviewerName,
        Role reviewerRole,
        boolean approved,
        List<String> staffEmails
) {
}

package bg.uktc.pansion.notification.event;

import bg.uktc.pansion.domain.enums.Dormitory;

import java.util.List;

/** Published when a student checks in (status set to enrolled). */
public record EnrollmentConfirmedEvent(
        String studentEmail,
        String fullName,
        Dormitory dormitory,
        List<String> staffEmails
) {
}

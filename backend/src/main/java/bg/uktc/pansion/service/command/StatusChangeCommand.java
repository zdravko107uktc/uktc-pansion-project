package bg.uktc.pansion.service.command;

import bg.uktc.pansion.domain.enums.EnrollmentStatus;

/** Input for a student changing their enrollment status. */
public record StatusChangeCommand(
        EnrollmentStatus status,
        String location,
        String signature
) {
}

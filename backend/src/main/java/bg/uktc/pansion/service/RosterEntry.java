package bg.uktc.pansion.service;

import bg.uktc.pansion.domain.entity.StudentStatus;
import bg.uktc.pansion.domain.entity.User;

/** A student together with their most recent status row, or {@code null} if they have none yet. */
public record RosterEntry(User student, StudentStatus status) {
}

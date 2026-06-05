package bg.uktc.pansion.notification.event;

import bg.uktc.pansion.domain.enums.Role;

/** Published on a successful login. */
public record UserLoggedInEvent(
        String email,
        String fullName,
        Role role,
        String adminEmail
) {
}

package bg.uktc.pansion.notification.event;

import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.domain.enums.Role;

/**
 * Published after a new account is created (self-registration or admin-managed).
 * {@code verificationUrl} is non-null only when email verification is enabled.
 */
public record UserRegisteredEvent(
        String email,
        String fullName,
        Role role,
        Dormitory dormitory,
        boolean selfRegistration,
        String verificationUrl,
        String adminEmail
) {
}

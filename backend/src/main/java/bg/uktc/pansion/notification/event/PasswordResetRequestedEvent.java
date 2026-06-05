package bg.uktc.pansion.notification.event;

/** Published when a user requests a password-reset link. */
public record PasswordResetRequestedEvent(
        String email,
        String fullName,
        String resetUrl,
        int expiryMinutes
) {
}

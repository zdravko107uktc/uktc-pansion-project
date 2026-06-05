package bg.uktc.pansion.notification.event;

/** Published after a password has been successfully reset. */
public record PasswordResetCompletedEvent(
        String email,
        String fullName
) {
}

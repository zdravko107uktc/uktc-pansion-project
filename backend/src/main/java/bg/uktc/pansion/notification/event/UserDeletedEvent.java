package bg.uktc.pansion.notification.event;

/** Published when an administrator deletes a user. */
public record UserDeletedEvent(String email) {
}

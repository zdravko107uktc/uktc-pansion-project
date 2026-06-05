package bg.uktc.pansion.notification.event;

/** Published when an administrator updates a user's profile. */
public record UserProfileUpdatedEvent(String email) {
}

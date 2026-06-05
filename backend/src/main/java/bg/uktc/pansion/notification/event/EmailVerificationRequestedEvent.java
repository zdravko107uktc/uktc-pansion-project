package bg.uktc.pansion.notification.event;

/** Published when a verification link should be (re)sent to a user. */
public record EmailVerificationRequestedEvent(
        String email,
        String fullName,
        String verificationUrl,
        int expiryHours
) {
}

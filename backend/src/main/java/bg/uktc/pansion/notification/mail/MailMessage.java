package bg.uktc.pansion.notification.mail;

/** Value object describing a single outbound plain-text email. */
public record MailMessage(
        String fromEmail,
        String fromName,
        String to,
        String subject,
        String body
) {
}

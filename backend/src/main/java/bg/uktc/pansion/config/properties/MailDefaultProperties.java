package bg.uktc.pansion.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Mail presentation/behaviour defaults that complement {@code spring.mail.*} transport config.
 *
 * @param from        the From address used on outgoing email
 * @param fromName     human friendly From name
 * @param forceLogOnly when true, emails are persisted to the audit log but never delivered
 */
@ConfigurationProperties(prefix = "app.mail")
public record MailDefaultProperties(
        String from,
        String fromName,
        boolean forceLogOnly
) {
    public MailDefaultProperties {
        if (from == null || from.isBlank()) {
            from = "school.inventory.bot@gmail.com";
        }
        if (fromName == null || fromName.isBlank()) {
            fromName = "UKTC Pansion";
        }
    }
}

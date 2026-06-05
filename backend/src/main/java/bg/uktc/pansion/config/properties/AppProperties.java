package bg.uktc.pansion.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Core application settings that are not security or transport specific.
 *
 * @param systemAdminEmail the email that is always promoted to the admin role
 * @param frontendBaseUrl  public URL of the SPA, used when building links in emails
 * @param timezone         the IANA timezone the business logic operates in
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String systemAdminEmail,
        String frontendBaseUrl,
        String timezone
) {
    public AppProperties {
        if (systemAdminEmail == null || systemAdminEmail.isBlank()) {
            systemAdminEmail = "zdravko.h.anev@gmail.com";
        }
        systemAdminEmail = systemAdminEmail.trim().toLowerCase();
        if (frontendBaseUrl == null || frontendBaseUrl.isBlank()) {
            frontendBaseUrl = "http://localhost:8080";
        }
        frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
        if (timezone == null || timezone.isBlank()) {
            timezone = "Europe/Sofia";
        }
    }
}

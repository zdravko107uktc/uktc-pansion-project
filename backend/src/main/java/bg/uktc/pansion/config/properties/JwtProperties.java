package bg.uktc.pansion.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JSON Web Token signing configuration.
 *
 * @param secret                 HMAC signing secret (must be at least 32 bytes for HS256)
 * @param issuer                 the {@code iss} claim value
 * @param accessTokenSeconds     lifetime of access tokens in seconds
 * @param refreshTokenSeconds    lifetime of refresh tokens in seconds
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret,
        String issuer,
        long accessTokenSeconds,
        long refreshTokenSeconds
) {
    public JwtProperties {
        if (secret == null || secret.isBlank()) {
            secret = "f2d4c95ec095862af68ae607be05ae45556aa2ae2b87a9306185cac71295bae2";
        }
        if (issuer == null || issuer.isBlank()) {
            issuer = "uktc-pansion";
        }
        if (accessTokenSeconds <= 0) {
            accessTokenSeconds = 14_400; // 4 hours, matching the legacy backend
        }
        if (refreshTokenSeconds <= 0) {
            refreshTokenSeconds = 1_209_600; // 14 days
        }
    }
}

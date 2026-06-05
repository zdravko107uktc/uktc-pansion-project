package bg.uktc.pansion.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Account-security policy knobs for the hardening features layered on top of the legacy behaviour.
 *
 * @param passwordResetTokenMinutes  lifetime of a password-reset link
 * @param maxFailedLogins            failed attempts before an account is temporarily locked
 * @param lockoutMinutes             how long an account stays locked after exceeding the limit
 * @param passwordHistoryDepth       how many previous password hashes are remembered to block reuse
 * @param requireEmailVerification   when true, unverified users cannot log in
 * @param emailVerificationTokenHours lifetime of an email-verification link
 */
@ConfigurationProperties(prefix = "app.security")
public record SecurityPolicyProperties(
        int passwordResetTokenMinutes,
        int maxFailedLogins,
        int lockoutMinutes,
        int passwordHistoryDepth,
        boolean requireEmailVerification,
        int emailVerificationTokenHours
) {
    public SecurityPolicyProperties {
        if (passwordResetTokenMinutes <= 0) {
            passwordResetTokenMinutes = 30;
        }
        if (maxFailedLogins <= 0) {
            maxFailedLogins = 5;
        }
        if (lockoutMinutes <= 0) {
            lockoutMinutes = 15;
        }
        if (passwordHistoryDepth < 0) {
            passwordHistoryDepth = 5;
        }
        if (emailVerificationTokenHours <= 0) {
            emailVerificationTokenHours = 48;
        }
    }
}

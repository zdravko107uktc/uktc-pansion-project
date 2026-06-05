package bg.uktc.pansion.service;

import bg.uktc.pansion.domain.entity.User;

/**
 * Outcome of a self-registration. {@code accessToken} is null when email verification is required,
 * in which case the user must verify before logging in.
 */
public record RegistrationResult(User user, String accessToken, String message) {
}

package bg.uktc.pansion.service;

import bg.uktc.pansion.config.properties.AppProperties;
import bg.uktc.pansion.config.properties.SecurityPolicyProperties;
import bg.uktc.pansion.domain.entity.PasswordResetToken;
import bg.uktc.pansion.domain.entity.User;
import bg.uktc.pansion.exception.BadRequestException;
import bg.uktc.pansion.notification.event.PasswordResetCompletedEvent;
import bg.uktc.pansion.notification.event.PasswordResetRequestedEvent;
import bg.uktc.pansion.repository.PasswordResetTokenRepository;
import bg.uktc.pansion.repository.UserRepository;
import bg.uktc.pansion.service.support.DateTimeService;
import bg.uktc.pansion.service.support.PasswordPolicy;
import bg.uktc.pansion.service.support.TokenFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.temporal.ChronoUnit;

/**
 * Forgotten-password flow. Requests always return the same generic message so the endpoint does not
 * disclose whether an email is registered; tokens are single-use, hashed and short-lived.
 */
@Service
public class PasswordResetService {

    private static final String GENERIC_MESSAGE =
            "Ако съществува акаунт с този имейл, изпратихме линк за смяна на паролата.";

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final TokenFactory tokenFactory;
    private final DateTimeService dateTime;
    private final SecurityPolicyProperties policy;
    private final AppProperties appProperties;
    private final ApplicationEventPublisher events;

    public PasswordResetService(PasswordResetTokenRepository tokenRepository,
                                UserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                PasswordPolicy passwordPolicy,
                                TokenFactory tokenFactory,
                                DateTimeService dateTime,
                                SecurityPolicyProperties policy,
                                AppProperties appProperties,
                                ApplicationEventPublisher events) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.tokenFactory = tokenFactory;
        this.dateTime = dateTime;
        this.policy = policy;
        this.appProperties = appProperties;
        this.events = events;
    }

    @Transactional
    public String requestReset(String email) {
        userRepository.findByEmailIgnoreCase(email.trim()).ifPresent(user -> {
            tokenRepository.invalidateAllForUser(user.getId(), dateTime.now());

            String rawToken = tokenFactory.generateRawToken();
            int minutes = Math.max(5, policy.passwordResetTokenMinutes());
            tokenRepository.save(new PasswordResetToken(
                    user, tokenFactory.hash(rawToken),
                    dateTime.now().plus(minutes, ChronoUnit.MINUTES)));

            String resetUrl = appProperties.frontendBaseUrl() + "/reset-password?token="
                    + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
            events.publishEvent(new PasswordResetRequestedEvent(
                    user.getEmail(), user.getFullName(), resetUrl, policy.passwordResetTokenMinutes()));
        });

        return GENERIC_MESSAGE;
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BadRequestException("Липсва токен за смяна на парола.");
        }
        passwordPolicy.validateStrength(newPassword);

        PasswordResetToken token = tokenRepository.findByTokenHash(tokenFactory.hash(rawToken))
                .filter(candidate -> candidate.isUsable(dateTime.now()))
                .orElseThrow(() -> new BadRequestException("Линкът за смяна на парола е невалиден или е изтекъл."));

        User user = token.getUser();
        passwordPolicy.assertNotReused(user, newPassword);

        String hash = passwordEncoder.encode(newPassword);
        user.setPasswordHash(hash);
        userRepository.save(user);
        passwordPolicy.remember(user, hash);

        token.markUsed(dateTime.now());
        tokenRepository.invalidateAllForUser(user.getId(), dateTime.now());

        events.publishEvent(new PasswordResetCompletedEvent(user.getEmail(), user.getFullName()));
    }
}

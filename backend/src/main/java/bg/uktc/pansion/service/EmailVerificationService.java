package bg.uktc.pansion.service;

import bg.uktc.pansion.config.properties.AppProperties;
import bg.uktc.pansion.config.properties.SecurityPolicyProperties;
import bg.uktc.pansion.domain.entity.EmailVerificationToken;
import bg.uktc.pansion.domain.entity.User;
import bg.uktc.pansion.exception.BadRequestException;
import bg.uktc.pansion.repository.EmailVerificationTokenRepository;
import bg.uktc.pansion.repository.UserRepository;
import bg.uktc.pansion.service.support.DateTimeService;
import bg.uktc.pansion.service.support.TokenFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.temporal.ChronoUnit;

/**
 * Issues and consumes single-use email-verification tokens. Only token hashes are stored.
 */
@Service
public class EmailVerificationService {

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final TokenFactory tokenFactory;
    private final DateTimeService dateTime;
    private final SecurityPolicyProperties policy;
    private final AppProperties appProperties;

    public EmailVerificationService(EmailVerificationTokenRepository tokenRepository,
                                    UserRepository userRepository,
                                    TokenFactory tokenFactory,
                                    DateTimeService dateTime,
                                    SecurityPolicyProperties policy,
                                    AppProperties appProperties) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.tokenFactory = tokenFactory;
        this.dateTime = dateTime;
        this.policy = policy;
        this.appProperties = appProperties;
    }

    public boolean isRequired() {
        return policy.requireEmailVerification();
    }

    public int expiryHours() {
        return policy.emailVerificationTokenHours();
    }

    /** Creates a fresh token for the user and returns the public verification URL. */
    @Transactional
    public String issueVerificationUrl(User user) {
        tokenRepository.invalidateAllForUser(user.getId(), dateTime.now());
        String rawToken = tokenFactory.generateRawToken();
        tokenRepository.save(new EmailVerificationToken(
                user, tokenFactory.hash(rawToken),
                dateTime.now().plus(expiryHours(), ChronoUnit.HOURS)));
        return appProperties.frontendBaseUrl() + "/verify-email?token="
                + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
    }

    @Transactional
    public void verify(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BadRequestException("Липсва токен за потвърждение.");
        }
        EmailVerificationToken token = tokenRepository.findByTokenHash(tokenFactory.hash(rawToken))
                .filter(candidate -> candidate.isUsable(dateTime.now()))
                .orElseThrow(() -> new BadRequestException("Линкът за потвърждение е невалиден или е изтекъл."));

        User user = token.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        token.markUsed(dateTime.now());
        tokenRepository.invalidateAllForUser(user.getId(), dateTime.now());
    }
}

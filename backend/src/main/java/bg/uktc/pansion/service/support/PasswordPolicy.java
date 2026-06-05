package bg.uktc.pansion.service.support;

import bg.uktc.pansion.config.properties.SecurityPolicyProperties;
import bg.uktc.pansion.domain.entity.PasswordHistory;
import bg.uktc.pansion.domain.entity.User;
import bg.uktc.pansion.exception.BadRequestException;
import bg.uktc.pansion.repository.PasswordHistoryRepository;
import org.springframework.data.domain.Limit;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Enforces password strength and (new) no-reuse rules, and maintains the per-user password history.
 */
@Component
public class PasswordPolicy {

    private static final Pattern UPPER = Pattern.compile("[A-Z]");
    private static final Pattern LOWER = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL = Pattern.compile("[^A-Za-z0-9]");
    private static final Pattern WHITESPACE = Pattern.compile("\\s");

    private final PasswordHistoryRepository passwordHistoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityPolicyProperties securityPolicy;

    public PasswordPolicy(PasswordHistoryRepository passwordHistoryRepository,
                          PasswordEncoder passwordEncoder,
                          SecurityPolicyProperties securityPolicy) {
        this.passwordHistoryRepository = passwordHistoryRepository;
        this.passwordEncoder = passwordEncoder;
        this.securityPolicy = securityPolicy;
    }

    public void validateStrength(String password) {
        if (password == null || password.length() < 10) {
            throw new BadRequestException("Паролата трябва да е поне 10 символа.");
        }
        if (password.length() > 72) {
            throw new BadRequestException("Паролата не може да е повече от 72 символа.");
        }
        if (!UPPER.matcher(password).find()) {
            throw new BadRequestException("Паролата трябва да съдържа поне една главна буква.");
        }
        if (!LOWER.matcher(password).find()) {
            throw new BadRequestException("Паролата трябва да съдържа поне една малка буква.");
        }
        if (!DIGIT.matcher(password).find()) {
            throw new BadRequestException("Паролата трябва да съдържа поне една цифра.");
        }
        if (!SPECIAL.matcher(password).find()) {
            throw new BadRequestException("Паролата трябва да съдържа поне един специален символ.");
        }
        if (WHITESPACE.matcher(password).find()) {
            throw new BadRequestException("Паролата не може да съдържа интервали.");
        }
    }

    /** Rejects reuse of any of the most recent {@code passwordHistoryDepth} passwords. */
    public void assertNotReused(User user, String rawPassword) {
        int depth = securityPolicy.passwordHistoryDepth();
        if (depth <= 0) {
            return;
        }
        boolean reused = passwordHistoryRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId(), Limit.of(depth)).stream()
                .anyMatch(history -> passwordEncoder.matches(rawPassword, history.getPasswordHash()));
        if (reused) {
            throw new BadRequestException("Не можете да използвате наскоро използвана парола.");
        }
    }

    /** Records the (already hashed) password and trims history beyond the configured depth. */
    public void remember(User user, String passwordHash) {
        passwordHistoryRepository.save(new PasswordHistory(user, passwordHash));

        int depth = securityPolicy.passwordHistoryDepth();
        if (depth <= 0) {
            return;
        }
        var all = passwordHistoryRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        if (all.size() > depth) {
            passwordHistoryRepository.deleteAll(all.subList(depth, all.size()));
        }
    }
}

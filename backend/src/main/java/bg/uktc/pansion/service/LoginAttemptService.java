package bg.uktc.pansion.service;

import bg.uktc.pansion.config.properties.SecurityPolicyProperties;
import bg.uktc.pansion.domain.entity.LoginAttempt;
import bg.uktc.pansion.exception.TooManyRequestsException;
import bg.uktc.pansion.repository.LoginAttemptRepository;
import bg.uktc.pansion.service.support.DateTimeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Implements temporary account lockout: after {@code maxFailedLogins} failures within the lockout
 * window, further attempts for that email are rejected with HTTP 429 until the window passes.
 */
@Service
public class LoginAttemptService {

    private final LoginAttemptRepository loginAttemptRepository;
    private final SecurityPolicyProperties policy;
    private final DateTimeService dateTime;

    public LoginAttemptService(LoginAttemptRepository loginAttemptRepository,
                               SecurityPolicyProperties policy,
                               DateTimeService dateTime) {
        this.loginAttemptRepository = loginAttemptRepository;
        this.policy = policy;
        this.dateTime = dateTime;
    }

    public void assertNotLocked(String email) {
        if (recentFailures(email) >= policy.maxFailedLogins()) {
            throw new TooManyRequestsException(
                    "Прекалено много неуспешни опити. Опитайте отново след " + policy.lockoutMinutes() + " минути.");
        }
    }

    // REQUIRES_NEW so the attempt is committed independently of the caller's transaction, which is
    // rolled back when login fails with an exception.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(String email, String ipAddress) {
        loginAttemptRepository.save(new LoginAttempt(normalize(email), ipAddress, false));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordSuccess(String email, String ipAddress) {
        loginAttemptRepository.deleteByEmailIgnoreCase(normalize(email));
        loginAttemptRepository.save(new LoginAttempt(normalize(email), ipAddress, true));
    }

    private long recentFailures(String email) {
        Instant windowStart = dateTime.now().minus(policy.lockoutMinutes(), ChronoUnit.MINUTES);
        return loginAttemptRepository
                .countByEmailIgnoreCaseAndSuccessfulFalseAndCreatedAtAfter(normalize(email), windowStart);
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}

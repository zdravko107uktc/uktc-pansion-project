package bg.uktc.pansion.service.impl;

import bg.uktc.pansion.domain.entity.User;
import bg.uktc.pansion.exception.BadRequestException;
import bg.uktc.pansion.exception.ForbiddenException;
import bg.uktc.pansion.exception.UnauthorizedException;
import bg.uktc.pansion.notification.event.UserLoggedInEvent;
import bg.uktc.pansion.repository.UserRepository;
import bg.uktc.pansion.security.JwtTokenProvider;
import bg.uktc.pansion.service.AuthService;
import bg.uktc.pansion.service.EmailVerificationService;
import bg.uktc.pansion.service.LoginAttemptService;
import bg.uktc.pansion.service.RegistrationResult;
import bg.uktc.pansion.service.UserService;
import bg.uktc.pansion.service.command.RegisterCommand;
import bg.uktc.pansion.service.support.RolePolicy;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final LoginAttemptService loginAttemptService;
    private final EmailVerificationService emailVerificationService;
    private final RolePolicy rolePolicy;
    private final ApplicationEventPublisher events;

    public AuthServiceImpl(UserService userService,
                           UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           JwtTokenProvider tokenProvider,
                           LoginAttemptService loginAttemptService,
                           EmailVerificationService emailVerificationService,
                           RolePolicy rolePolicy,
                           ApplicationEventPublisher events) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.loginAttemptService = loginAttemptService;
        this.emailVerificationService = emailVerificationService;
        this.rolePolicy = rolePolicy;
        this.events = events;
    }

    @Override
    @Transactional
    public RegistrationResult register(RegisterCommand command) {
        User user = userService.register(command);

        if (emailVerificationService.isRequired() && !user.isEmailVerified()) {
            return new RegistrationResult(user, null,
                    "Регистрацията е успешна. Проверете имейла си, за да потвърдите профила.");
        }

        String token = tokenProvider.generateAccessToken(user.getId(), user.getRole().getValue());
        return new RegistrationResult(user, token, "Регистрацията е успешна.");
    }

    @Override
    @Transactional
    public String login(String email, String password, String ipAddress) {
        String normalizedEmail = rolePolicy.normalizeEmail(email);
        if (normalizedEmail.isBlank() || password == null || password.isBlank()) {
            throw new BadRequestException("Всички полета са задължителни.");
        }

        loginAttemptService.assertNotLocked(normalizedEmail);

        Optional<User> candidate = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (candidate.isEmpty() || !passwordEncoder.matches(password, candidate.get().getPasswordHash())) {
            loginAttemptService.recordFailure(normalizedEmail, ipAddress);
            throw new UnauthorizedException("Грешен email или парола.");
        }

        User user = candidate.get();
        if (emailVerificationService.isRequired() && !user.isEmailVerified()) {
            throw new ForbiddenException("Моля, потвърдете имейла си, преди да влезете.");
        }

        // Self-heal a drifted role (e.g. the system admin email) before issuing the token.
        User healed = userService.getCurrentUser(user.getId());
        loginAttemptService.recordSuccess(normalizedEmail, ipAddress);

        String token = tokenProvider.generateAccessToken(healed.getId(), healed.getRole().getValue());
        events.publishEvent(new UserLoggedInEvent(
                healed.getEmail(), healed.getFullName(), healed.getRole(), rolePolicy.systemAdminEmail()));
        return token;
    }
}

package bg.uktc.pansion.service.impl;

import bg.uktc.pansion.domain.entity.User;
import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.domain.enums.Role;
import bg.uktc.pansion.exception.BadRequestException;
import bg.uktc.pansion.exception.ConflictException;
import bg.uktc.pansion.exception.NotFoundException;
import bg.uktc.pansion.notification.event.UserDeletedEvent;
import bg.uktc.pansion.notification.event.UserProfileUpdatedEvent;
import bg.uktc.pansion.notification.event.UserRegisteredEvent;
import bg.uktc.pansion.repository.UserRepository;
import bg.uktc.pansion.service.EmailVerificationService;
import bg.uktc.pansion.service.UserService;
import bg.uktc.pansion.service.command.ManagedUserCommand;
import bg.uktc.pansion.service.command.RegisterCommand;
import bg.uktc.pansion.service.command.UpdateUserCommand;
import bg.uktc.pansion.service.support.InputValidator;
import bg.uktc.pansion.service.support.PasswordPolicy;
import bg.uktc.pansion.service.support.RolePolicy;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RolePolicy rolePolicy;
    private final InputValidator validator;
    private final PasswordPolicy passwordPolicy;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService;
    private final ApplicationEventPublisher events;

    public UserServiceImpl(UserRepository userRepository,
                           RolePolicy rolePolicy,
                           InputValidator validator,
                           PasswordPolicy passwordPolicy,
                           PasswordEncoder passwordEncoder,
                           EmailVerificationService emailVerificationService,
                           ApplicationEventPublisher events) {
        this.userRepository = userRepository;
        this.rolePolicy = rolePolicy;
        this.validator = validator;
        this.passwordPolicy = passwordPolicy;
        this.passwordEncoder = passwordEncoder;
        this.emailVerificationService = emailVerificationService;
        this.events = events;
    }

    @Override
    @Transactional(readOnly = true)
    public User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Потребителят не е намерен."));
    }

    @Override
    @Transactional
    public User getCurrentUser(Long id) {
        User user = getById(id);
        Role expected = rolePolicy.expectedRole(user.getEmail(), user.getRole());
        if (user.getRole() != expected) {
            user.setRole(expected);
            userRepository.save(user);
        }
        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public List<User> listAll() {
        return userRepository.findAllByOrderByCreatedAtDesc();
    }

    @Override
    @Transactional
    public User register(RegisterCommand command) {
        String name = trim(command.name());
        String email = trim(command.email());
        Role role = rolePolicy.roleForSelfRegistration(email);
        Dormitory dormitory = role == Role.ADMIN ? null : command.dormitory();

        validateNewUser(name, email, command.password(), role, dormitory);
        assertEmailAvailable(email);

        boolean verified = !emailVerificationService.isRequired();
        User user = persistUser(name, email, command.password(), role, dormitory, verified);

        String verificationUrl = verified ? null : emailVerificationService.issueVerificationUrl(user);
        events.publishEvent(new UserRegisteredEvent(
                user.getEmail(), user.getFullName(), role, dormitory, true, verificationUrl,
                rolePolicy.systemAdminEmail()));
        return user;
    }

    @Override
    @Transactional
    public User createManagedUser(ManagedUserCommand command) {
        String name = trim(command.name());
        String email = trim(command.email());
        Role role = rolePolicy.normalizeManagedRole(command.role(), email);
        Dormitory dormitory = role == Role.ADMIN ? null : command.dormitory();

        validateNewUser(name, email, command.password(), role, dormitory);
        assertEmailAvailable(email);

        User user = persistUser(name, email, command.password(), role, dormitory, true);
        events.publishEvent(new UserRegisteredEvent(
                user.getEmail(), user.getFullName(), role, dormitory, false, null,
                rolePolicy.systemAdminEmail()));
        return user;
    }

    @Override
    @Transactional
    public User updateUser(UpdateUserCommand command) {
        User existing = getById(command.userId());
        String name = trim(command.name());
        String email = trim(command.email());

        validator.validateFullName(name);
        validator.validateEmail(email);

        if (rolePolicy.isSystemAdminEmail(existing.getEmail())
                && !rolePolicy.isSystemAdminEmail(email)) {
            throw new BadRequestException("Имейлът на системния админ не може да бъде променян.");
        }
        if (userRepository.existsByEmailIgnoreCaseAndIdNot(email, existing.getId())) {
            throw new ConflictException("Имейлът вече се използва от друг потребител.");
        }

        Role role = rolePolicy.normalizeManagedRole(command.role(), email);
        Dormitory dormitory = role == Role.ADMIN ? null : command.dormitory();
        if (role != Role.ADMIN) {
            validator.validateDormitory(dormitory);
        }

        existing.setFullName(name);
        existing.setEmail(email);
        existing.setRole(role);
        existing.setDormitory(dormitory);
        User saved = userRepository.save(existing);

        events.publishEvent(new UserProfileUpdatedEvent(saved.getEmail()));
        return saved;
    }

    @Override
    @Transactional
    public void deleteUser(Long targetUserId, Long actingUserId) {
        if (targetUserId.equals(actingUserId)) {
            throw new BadRequestException("Не можете да изтриете собствения си акаунт.");
        }
        User existing = getById(targetUserId);
        if (rolePolicy.isSystemAdminEmail(existing.getEmail())) {
            throw new BadRequestException("Системният админ не може да бъде изтрит.");
        }

        String email = existing.getEmail();
        userRepository.delete(existing);
        events.publishEvent(new UserDeletedEvent(email));
    }

    private void validateNewUser(String name, String email, String password, Role role, Dormitory dormitory) {
        if (name.isBlank() || email.isBlank() || password == null || password.isBlank()) {
            throw new BadRequestException("Всички полета са задължителни.");
        }
        validator.validateFullName(name);
        validator.validateEmail(email);
        passwordPolicy.validateStrength(password);
        if (role != Role.ADMIN) {
            validator.validateDormitory(dormitory);
        }
    }

    private void assertEmailAvailable(String email) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Имейлът вече е регистриран.");
        }
    }

    private User persistUser(String name, String email, String password, Role role,
                             Dormitory dormitory, boolean verified) {
        String hash = passwordEncoder.encode(password);
        User user = new User(name, email, hash, role, dormitory);
        user.setEmailVerified(verified);
        User saved = userRepository.save(user);
        passwordPolicy.remember(saved, hash);
        return saved;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}

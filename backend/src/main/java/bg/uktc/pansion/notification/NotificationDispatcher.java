package bg.uktc.pansion.notification;

import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.domain.enums.Role;
import bg.uktc.pansion.notification.event.CalendarEventChangedEvent;
import bg.uktc.pansion.notification.event.EmailVerificationRequestedEvent;
import bg.uktc.pansion.notification.event.EnrollmentConfirmedEvent;
import bg.uktc.pansion.notification.event.PasswordResetCompletedEvent;
import bg.uktc.pansion.notification.event.PasswordResetRequestedEvent;
import bg.uktc.pansion.notification.event.UnenrollmentRequestedEvent;
import bg.uktc.pansion.notification.event.UnenrollmentReviewedEvent;
import bg.uktc.pansion.notification.event.UserDeletedEvent;
import bg.uktc.pansion.notification.event.UserLoggedInEvent;
import bg.uktc.pansion.notification.event.UserProfileUpdatedEvent;
import bg.uktc.pansion.notification.event.UserRegisteredEvent;
import bg.uktc.pansion.service.support.DateTimeService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.format.DateTimeFormatter;

/**
 * The "observer" side of the notification subsystem. Each business action publishes a domain event;
 * this component composes the (Bulgarian) email content and hands it to {@link NotificationService}.
 *
 * <p>Listeners run after the triggering transaction commits and on a dedicated executor, so email
 * delivery never blocks or rolls back the originating request. Adding a new notification means
 * adding an event + a handler here — no business service changes (Open/Closed).</p>
 */
@Component
public class NotificationDispatcher {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final NotificationService notifications;
    private final DateTimeService dateTime;

    public NotificationDispatcher(NotificationService notifications, DateTimeService dateTime) {
        this.notifications = notifications;
        this.dateTime = dateTime;
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onUserRegistered(UserRegisteredEvent event) {
        String roleLabel = roleLabel(event.role());
        StringBuilder welcome = new StringBuilder()
                .append("Здравейте, ").append(event.fullName()).append(",\n\n")
                .append("Вашият профил в UKTC Pansion беше създаден успешно.\n")
                .append("Роля: ").append(roleLabel).append('\n');
        if (event.dormitory() != null) {
            welcome.append("Общежитие: ").append(event.dormitory().getValue()).append('\n');
        }
        if (event.verificationUrl() != null) {
            welcome.append("\nПотвърдете имейла си на:\n").append(event.verificationUrl()).append('\n');
        }
        welcome.append("\nТова е автоматично известие.");
        notifications.send(event.email(), "Успешна регистрация в UKTC Pansion", welcome.toString(), "register_user");

        StringBuilder adminBody = new StringBuilder()
                .append("Нов профил беше създаден в системата.\n\n")
                .append("Име: ").append(event.fullName()).append('\n')
                .append("Имейл: ").append(event.email()).append('\n')
                .append("Роля: ").append(roleLabel).append('\n');
        if (event.dormitory() != null) {
            adminBody.append("Общежитие: ").append(event.dormitory().getValue()).append('\n');
        }
        notifications.send(event.adminEmail(), "Създаден нов профил", adminBody.toString(), "register_admin");
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onUserLoggedIn(UserLoggedInEvent event) {
        String when = dateTime.formatBgNow();
        notifications.send(event.email(), "Успешен вход в UKTC Pansion",
                "Здравейте, " + event.fullName() + ",\n\n"
                        + "Има нов вход във вашия акаунт в UKTC Pansion на " + when + ".\n\n"
                        + "Ако не сте били вие, сменете паролата си.",
                "login_user");

        notifications.send(event.adminEmail(), "Вход в UKTC Pansion",
                "Потребител влезе в системата.\n\n"
                        + "Име: " + event.fullName() + "\n"
                        + "Имейл: " + event.email() + "\n"
                        + "Роля: " + roleLabel(event.role()) + "\n"
                        + "Час: " + when,
                "login_admin");
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onUserProfileUpdated(UserProfileUpdatedEvent event) {
        notifications.send(event.email(), "Профилът ви беше обновен",
                "Профилът ви в UKTC Pansion беше обновен от администратор.", "user_updated");
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onUserDeleted(UserDeletedEvent event) {
        notifications.send(event.email(), "Профилът ви беше изтрит",
                "Профилът ви в UKTC Pansion беше изтрит от администратор.", "user_deleted");
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onEnrollmentConfirmed(EnrollmentConfirmedEvent event) {
        notifications.send(event.studentEmail(), "Потвърдено записване",
                "Статусът ви е променен успешно на \"Записан\".\n\nЧас: " + dateTime.formatBgNow(),
                "enrolled_user");

        notifications.sendMany(event.staffEmails(), "Ученикът се записа",
                "Ученик: " + event.fullName() + "\n"
                        + "Имейл: " + event.studentEmail() + "\n"
                        + "Общежитие: " + dormitoryLabel(event.dormitory()),
                "enrolled_staff");
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onUnenrollmentRequested(UnenrollmentRequestedEvent event) {
        notifications.send(event.studentEmail(), "Подадена заявка за отписване",
                "Заявката ви за отписване е подадена успешно.\n\n"
                        + "Локация: " + event.location() + "\n"
                        + "Статус: очаква одобрение.",
                "unenroll_request_user");

        notifications.sendMany(event.staffEmails(), "Нова заявка за отписване",
                "Нова заявка за отписване.\n\n"
                        + "Ученик: " + event.fullName() + "\n"
                        + "Имейл: " + event.studentEmail() + "\n"
                        + "Общежитие: " + dormitoryLabel(event.dormitory()) + "\n"
                        + "Локация: " + event.location(),
                "unenroll_request_staff");
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onUnenrollmentReviewed(UnenrollmentReviewedEvent event) {
        String reviewerLabel = event.reviewerRole() == Role.ADMIN ? "администратор" : "възпитател";
        String outcome = event.approved() ? "одобрена" : "отказана";
        notifications.send(event.studentEmail(),
                event.approved() ? "Одобрена заявка за отписване" : "Отказана заявка за отписване",
                "Вашата заявка за отписване беше " + outcome + ".\n\n"
                        + "Локация: " + event.location() + "\n"
                        + "Обработил: " + event.reviewerName() + " (" + reviewerLabel + ")\n"
                        + "Час: " + dateTime.formatBgNow(),
                event.approved() ? "approve_user" : "reject_user");

        notifications.sendMany(event.staffEmails(),
                event.approved() ? "Одобрено отписване" : "Отказано отписване",
                (event.reviewerRole() == Role.ADMIN ? "Администратор" : "Възпитател") + ": "
                        + event.reviewerName() + " обработи заявка.\n\n"
                        + "Ученик: " + event.studentName() + "\n"
                        + "Имейл: " + event.studentEmail() + "\n"
                        + "Локация: " + event.location(),
                event.approved() ? "approve_staff" : "reject_staff");
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onCalendarEventChanged(CalendarEventChangedEvent event) {
        String verb = switch (event.changeType()) {
            case CREATED -> "Създадено е";
            case UPDATED -> "Редактирано е";
            case DELETED -> "Изтрито е";
        };
        String subject = switch (event.changeType()) {
            case CREATED -> "Ново календарно събитие";
            case UPDATED -> "Редактирано календарно събитие";
            case DELETED -> "Изтрито календарно събитие";
        };
        String eventType = switch (event.changeType()) {
            case CREATED -> "calendar_event";
            case UPDATED -> "calendar_event_updated";
            case DELETED -> "calendar_event_deleted";
        };

        StringBuilder body = new StringBuilder()
                .append(verb).append(" календарно събитие в UKTC Pansion.\n\n")
                .append("Заглавие: ").append(event.title()).append('\n')
                .append("Дата: ").append(DATE.format(event.eventDate()));
        if (event.endDate() != null) {
            body.append(" - ").append(DATE.format(event.endDate()));
        }
        body.append('\n');
        if (event.description() != null && !event.description().isBlank()) {
            body.append("Описание: ").append(event.description()).append('\n');
        }
        body.append("\nОт: ").append(event.actorName());

        notifications.sendMany(event.recipientEmails(), subject, body.toString(), eventType);
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPasswordResetRequested(PasswordResetRequestedEvent event) {
        notifications.send(event.email(), "Смяна на парола в UKTC Pansion",
                "Здравейте, " + event.fullName() + ",\n\n"
                        + "Получихме заявка за смяна на паролата ви в UKTC Pansion.\n"
                        + "Използвайте този линк в следващите " + event.expiryMinutes() + " минути:\n"
                        + event.resetUrl() + "\n\n"
                        + "Ако не сте поискали смяна, просто игнорирайте това писмо.",
                "password_reset_request");
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPasswordResetCompleted(PasswordResetCompletedEvent event) {
        notifications.send(event.email(), "Паролата ви беше сменена",
                "Здравейте, " + event.fullName() + ",\n\n"
                        + "Паролата ви за UKTC Pansion беше сменена успешно на " + dateTime.formatBgNow() + ".\n\n"
                        + "Ако това не сте били вие, свържете се с администратора веднага.",
                "password_reset_success");
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onEmailVerificationRequested(EmailVerificationRequestedEvent event) {
        notifications.send(event.email(), "Потвърдете имейла си в UKTC Pansion",
                "Здравейте, " + event.fullName() + ",\n\n"
                        + "Потвърдете имейл адреса си, за да активирате достъпа си.\n"
                        + "Линкът е валиден " + event.expiryHours() + " часа:\n"
                        + event.verificationUrl(),
                "email_verification");
    }

    private String roleLabel(Role role) {
        return switch (role) {
            case ADMIN -> "администратор";
            case COUNSELOR -> "възпитател";
            case STUDENT -> "ученик";
        };
    }

    private String dormitoryLabel(Dormitory dormitory) {
        return dormitory == null ? "-" : dormitory.getValue();
    }
}

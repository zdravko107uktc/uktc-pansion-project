package bg.uktc.pansion.notification;

import bg.uktc.pansion.config.properties.MailDefaultProperties;
import bg.uktc.pansion.domain.entity.EmailNotification;
import bg.uktc.pansion.domain.enums.NotificationStatus;
import bg.uktc.pansion.exception.NotFoundException;
import bg.uktc.pansion.notification.mail.MailMessage;
import bg.uktc.pansion.notification.mail.MailTransport;
import bg.uktc.pansion.repository.EmailNotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final MailTransport mailTransport;
    private final MailDefaultProperties mailDefaults;
    private final EmailNotificationRepository notificationRepository;

    public NotificationServiceImpl(MailTransport mailTransport,
                                   MailDefaultProperties mailDefaults,
                                   EmailNotificationRepository notificationRepository) {
        this.mailTransport = mailTransport;
        this.mailDefaults = mailDefaults;
        this.notificationRepository = notificationRepository;
    }

    @Override
    @Transactional
    public void send(String recipientEmail, String subject, String body, String eventType) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return;
        }

        NotificationStatus status = NotificationStatus.LOGGED;
        String errorMessage = null;

        if (mailDefaults.forceLogOnly()) {
            errorMessage = "Email delivery is disabled because app.mail.force-log-only is enabled.";
        } else if (!mailTransport.isAvailable()) {
            status = NotificationStatus.FAILED;
            errorMessage = "No email transport is configured. Set spring.mail.host (MAIL_SMTP_HOST).";
        } else {
            try {
                mailTransport.send(new MailMessage(
                        mailDefaults.from(), mailDefaults.fromName(), recipientEmail, subject, body));
                status = NotificationStatus.SENT;
            } catch (Exception exception) {
                status = NotificationStatus.FAILED;
                errorMessage = exception.getMessage();
                log.warn("Failed to deliver '{}' email to {}: {}", eventType, recipientEmail, errorMessage);
            }
        }

        notificationRepository.save(
                new EmailNotification(recipientEmail, subject, body, eventType, status, errorMessage));
    }

    @Override
    public void sendMany(Collection<String> recipientEmails, String subject, String body, String eventType) {
        Set<String> unique = new LinkedHashSet<>();
        for (String email : recipientEmails) {
            if (email != null && !email.isBlank()) {
                unique.add(email.trim());
            }
        }
        unique.forEach(email -> send(email, subject, body, eventType));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmailNotification> recentLogs(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        return notificationRepository.findAllByOrderByCreatedAtDesc(Limit.of(safeLimit));
    }

    @Override
    @Transactional
    public void deleteLog(Long notificationId) {
        if (!notificationRepository.existsById(notificationId)) {
            throw new NotFoundException("Логът не е намерен.");
        }
        notificationRepository.deleteById(notificationId);
    }

    @Override
    @Transactional
    public void clearLogs() {
        notificationRepository.deleteAllInBatch();
    }
}

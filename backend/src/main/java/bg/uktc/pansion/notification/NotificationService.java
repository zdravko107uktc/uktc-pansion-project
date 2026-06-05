package bg.uktc.pansion.notification;

import bg.uktc.pansion.domain.entity.EmailNotification;

import java.util.Collection;
import java.util.List;

/**
 * Sends notification emails and records every attempt in the audit log, and exposes read/maintenance
 * operations on that log for administrators.
 */
public interface NotificationService {

    void send(String recipientEmail, String subject, String body, String eventType);

    void sendMany(Collection<String> recipientEmails, String subject, String body, String eventType);

    List<EmailNotification> recentLogs(int limit);

    void deleteLog(Long notificationId);

    void clearLogs();
}

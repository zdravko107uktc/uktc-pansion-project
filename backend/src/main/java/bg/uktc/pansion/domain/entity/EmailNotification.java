package bg.uktc.pansion.domain.entity;

import bg.uktc.pansion.domain.enums.NotificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** Audit-log row written for every outbound email, whether it was delivered, failed or only logged. */
@Entity
@Table(name = "email_notifications")
public class EmailNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "subject", nullable = false)
    private String subject;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "status", nullable = false)
    private NotificationStatus status = NotificationStatus.LOGGED;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected EmailNotification() {
        // for JPA
    }

    public EmailNotification(String recipientEmail, String subject, String body, String eventType,
                             NotificationStatus status, String errorMessage) {
        this.recipientEmail = recipientEmail;
        this.subject = subject;
        this.body = body;
        this.eventType = eventType;
        this.status = status;
        this.errorMessage = errorMessage;
    }

    public Long getId() {
        return id;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public String getSubject() {
        return subject;
    }

    public String getBody() {
        return body;
    }

    public String getEventType() {
        return eventType;
    }

    public NotificationStatus getStatus() {
        return status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

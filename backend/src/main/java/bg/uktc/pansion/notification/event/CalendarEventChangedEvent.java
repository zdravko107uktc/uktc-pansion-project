package bg.uktc.pansion.notification.event;

import java.time.LocalDate;
import java.util.List;

/** Published when an admin creates, updates or deletes a calendar event; broadcast to all users. */
public record CalendarEventChangedEvent(
        ChangeType changeType,
        String title,
        String description,
        LocalDate eventDate,
        LocalDate endDate,
        String actorName,
        List<String> recipientEmails
) {
    public enum ChangeType {
        CREATED, UPDATED, DELETED
    }
}

package bg.uktc.pansion.service.command;

import java.time.LocalDate;

/** Normalised input for creating or updating a calendar event. */
public record CalendarEventCommand(
        String title,
        String description,
        LocalDate eventDate,
        LocalDate endDate
) {
}

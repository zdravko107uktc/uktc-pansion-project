package bg.uktc.pansion.service;

import bg.uktc.pansion.domain.entity.CalendarEvent;
import bg.uktc.pansion.service.command.CalendarEventCommand;

/** Calendar read model plus admin-only event management. */
public interface CalendarService {

    CalendarSnapshot getCalendarData(Long userId, String month);

    CalendarEvent createEvent(Long adminId, CalendarEventCommand command);

    CalendarEvent updateEvent(Long adminId, Long eventId, CalendarEventCommand command);

    void deleteEvent(Long adminId, Long eventId);
}

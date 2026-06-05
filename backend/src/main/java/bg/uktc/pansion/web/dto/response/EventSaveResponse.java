package bg.uktc.pansion.web.dto.response;

/** Response for create/update calendar event operations. */
public record EventSaveResponse(String message, CalendarEventResponse event) {
}

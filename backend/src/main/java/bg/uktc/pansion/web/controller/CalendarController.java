package bg.uktc.pansion.web.controller;

import bg.uktc.pansion.security.AppUserPrincipal;
import bg.uktc.pansion.service.CalendarService;
import bg.uktc.pansion.service.command.CalendarEventCommand;
import bg.uktc.pansion.web.dto.request.CalendarEventRequest;
import bg.uktc.pansion.web.dto.response.CalendarDataResponse;
import bg.uktc.pansion.web.dto.response.EventSaveResponse;
import bg.uktc.pansion.web.dto.response.MessageResponse;
import bg.uktc.pansion.web.mapper.ApiMapper;
import bg.uktc.pansion.web.mapper.RequestParser;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/calendar")
public class CalendarController {

    private final CalendarService calendarService;

    public CalendarController(CalendarService calendarService) {
        this.calendarService = calendarService;
    }

    @GetMapping
    public CalendarDataResponse calendar(@AuthenticationPrincipal AppUserPrincipal principal,
                                         @RequestParam(name = "month", required = false) String month) {
        return ApiMapper.toCalendarData(calendarService.getCalendarData(principal.getId(), month));
    }

    @PostMapping("/events")
    @PreAuthorize("hasRole('ADMIN')")
    public EventSaveResponse createEvent(@AuthenticationPrincipal AppUserPrincipal principal,
                                         @Valid @RequestBody CalendarEventRequest request) {
        var event = calendarService.createEvent(principal.getId(), toCommand(request));
        return new EventSaveResponse("Събитието е създадено успешно.", ApiMapper.toEvent(event));
    }

    @PutMapping("/events/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public EventSaveResponse updateEvent(@AuthenticationPrincipal AppUserPrincipal principal,
                                         @PathVariable Long id,
                                         @Valid @RequestBody CalendarEventRequest request) {
        var event = calendarService.updateEvent(principal.getId(), id, toCommand(request));
        return new EventSaveResponse("Събитието е редактирано успешно.", ApiMapper.toEvent(event));
    }

    @DeleteMapping("/events/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public MessageResponse deleteEvent(@AuthenticationPrincipal AppUserPrincipal principal,
                                       @PathVariable Long id) {
        calendarService.deleteEvent(principal.getId(), id);
        return new MessageResponse("Събитието е изтрито успешно.");
    }

    private CalendarEventCommand toCommand(CalendarEventRequest request) {
        String description = request.description() == null || request.description().isBlank()
                ? null : request.description().trim();
        return new CalendarEventCommand(
                request.title() == null ? null : request.title().trim(),
                description,
                RequestParser.requiredDate(request.eventDate()),
                RequestParser.optionalDate(request.endDate()));
    }
}

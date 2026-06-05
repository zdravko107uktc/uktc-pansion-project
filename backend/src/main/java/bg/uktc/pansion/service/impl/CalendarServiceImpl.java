package bg.uktc.pansion.service.impl;

import bg.uktc.pansion.domain.entity.CalendarEvent;
import bg.uktc.pansion.domain.entity.User;
import bg.uktc.pansion.exception.BadRequestException;
import bg.uktc.pansion.exception.ForbiddenException;
import bg.uktc.pansion.exception.NotFoundException;
import bg.uktc.pansion.notification.event.CalendarEventChangedEvent;
import bg.uktc.pansion.notification.event.CalendarEventChangedEvent.ChangeType;
import bg.uktc.pansion.repository.CalendarEventRepository;
import bg.uktc.pansion.repository.StudentStatusRepository;
import bg.uktc.pansion.repository.UserRepository;
import bg.uktc.pansion.service.CalendarService;
import bg.uktc.pansion.service.CalendarSnapshot;
import bg.uktc.pansion.service.EnrollmentService;
import bg.uktc.pansion.service.UserService;
import bg.uktc.pansion.service.command.CalendarEventCommand;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class CalendarServiceImpl implements CalendarService {

    private final CalendarEventRepository eventRepository;
    private final StudentStatusRepository statusRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final EnrollmentService enrollmentService;
    private final ApplicationEventPublisher events;

    public CalendarServiceImpl(CalendarEventRepository eventRepository,
                               StudentStatusRepository statusRepository,
                               UserRepository userRepository,
                               UserService userService,
                               EnrollmentService enrollmentService,
                               ApplicationEventPublisher events) {
        this.eventRepository = eventRepository;
        this.statusRepository = statusRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.enrollmentService = enrollmentService;
        this.events = events;
    }

    @Override
    @Transactional(readOnly = true)
    public CalendarSnapshot getCalendarData(Long userId, String month) {
        User user = userService.getCurrentUser(userId);
        YearMonth yearMonth = parseMonth(month);
        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();
        String monthValue = yearMonth.toString();

        List<CalendarEvent> calendarEvents = eventRepository.findOverlapping(start, end);

        if (user.isAdmin()) {
            return new CalendarSnapshot(monthValue, calendarEvents, true,
                    statusRepository.findMonthlySummary(start, end), null);
        }
        return new CalendarSnapshot(monthValue, calendarEvents, false, null,
                enrollmentService.getStudentAttendanceForMonth(userId, start, end));
    }

    @Override
    @Transactional
    public CalendarEvent createEvent(Long adminId, CalendarEventCommand command) {
        User admin = requireAdmin(adminId);
        validate(command);
        CalendarEvent event = eventRepository.save(new CalendarEvent(
                command.title(), command.description(), command.eventDate(), command.endDate(), admin));
        publishChange(ChangeType.CREATED, event, admin);
        return event;
    }

    @Override
    @Transactional
    public CalendarEvent updateEvent(Long adminId, Long eventId, CalendarEventCommand command) {
        User admin = requireAdmin(adminId);
        validate(command);
        CalendarEvent event = eventRepository.findByIdWithCreator(eventId)
                .orElseThrow(() -> new NotFoundException("Събитието не е намерено."));
        event.update(command.title(), command.description(), command.eventDate(), command.endDate());
        CalendarEvent saved = eventRepository.save(event);
        publishChange(ChangeType.UPDATED, saved, admin);
        return saved;
    }

    @Override
    @Transactional
    public void deleteEvent(Long adminId, Long eventId) {
        User admin = requireAdmin(adminId);
        CalendarEvent event = eventRepository.findByIdWithCreator(eventId)
                .orElseThrow(() -> new NotFoundException("Събитието не е намерено."));
        eventRepository.delete(event);
        publishChange(ChangeType.DELETED, event, admin);
    }

    private void publishChange(ChangeType type, CalendarEvent event, User admin) {
        List<String> recipients = userRepository.findAll().stream()
                .map(User::getEmail)
                .toList();
        events.publishEvent(new CalendarEventChangedEvent(
                type, event.getTitle(), event.getDescription(), event.getEventDate(), event.getEndDate(),
                admin.getFullName(), recipients));
    }

    private void validate(CalendarEventCommand command) {
        if (command.title() == null || command.title().isBlank() || command.eventDate() == null) {
            throw new BadRequestException("Заглавието и датата са задължителни.");
        }
        if (command.endDate() != null && command.endDate().isBefore(command.eventDate())) {
            throw new BadRequestException("Крайната дата не може да е преди началната.");
        }
    }

    private User requireAdmin(Long userId) {
        User user = userService.getCurrentUser(userId);
        if (!user.isAdmin()) {
            throw new ForbiddenException("Само администраторът има достъп до това действие.");
        }
        return user;
    }

    private YearMonth parseMonth(String month) {
        if (month == null || !month.matches("\\d{4}-\\d{2}")) {
            return YearMonth.now();
        }
        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException exception) {
            return YearMonth.now();
        }
    }
}

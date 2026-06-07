package bg.uktc.pansion.service.impl;

import bg.uktc.pansion.domain.entity.StudentStatus;
import bg.uktc.pansion.domain.entity.User;
import bg.uktc.pansion.domain.enums.ApprovalStatus;
import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.domain.enums.EnrollmentStatus;
import bg.uktc.pansion.domain.enums.Role;
import bg.uktc.pansion.exception.BadRequestException;
import bg.uktc.pansion.exception.ForbiddenException;
import bg.uktc.pansion.exception.NotFoundException;
import bg.uktc.pansion.notification.event.EnrollmentConfirmedEvent;
import bg.uktc.pansion.notification.event.UnenrollmentRequestedEvent;
import bg.uktc.pansion.notification.event.UnenrollmentReviewedEvent;
import bg.uktc.pansion.repository.StudentStatusRepository;
import bg.uktc.pansion.repository.UserRepository;
import bg.uktc.pansion.repository.projection.OccupancyRow;
import bg.uktc.pansion.service.BulkReviewOutcome;
import bg.uktc.pansion.service.EnrollmentService;
import bg.uktc.pansion.service.UserService;
import bg.uktc.pansion.service.command.StatusChangeCommand;
import bg.uktc.pansion.service.support.DateTimeService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Service
public class EnrollmentServiceImpl implements EnrollmentService {

    private final StudentStatusRepository statusRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final DateTimeService dateTime;
    private final ZoneId zone;
    private final ApplicationEventPublisher events;

    public EnrollmentServiceImpl(StudentStatusRepository statusRepository,
                                 UserRepository userRepository,
                                 UserService userService,
                                 DateTimeService dateTime,
                                 ZoneId applicationZone,
                                 ApplicationEventPublisher events) {
        this.statusRepository = statusRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.dateTime = dateTime;
        this.zone = applicationZone;
        this.events = events;
    }

    @Override
    @Transactional
    public String submitStatusChange(Long studentId, StatusChangeCommand command) {
        User student = userService.getCurrentUser(studentId);
        if (student.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Само ученици могат да променят своя статус.");
        }
        EnrollmentStatus status = command.status();
        if (status == null) {
            throw new BadRequestException("Невалиден статус.");
        }
        if (statusRepository.existsByStudentIdAndApprovalStatus(studentId, ApprovalStatus.PENDING)) {
            throw new BadRequestException(
                    "Имате чакаща заявка за отписване. Изчакайте решение от администратор или възпитател.");
        }

        EnrollmentStatus last = currentStatus(studentId);
        if (last == status) {
            throw new BadRequestException(status == EnrollmentStatus.ENROLLED
                    ? "Вече сте записани." : "Вече сте отписани.");
        }

        List<String> staffEmails = userRepository.findStaffEmailsForDormitory(student.getDormitory());

        if (status == EnrollmentStatus.UNENROLLED) {
            String location = command.location() == null ? "" : command.location().trim();
            if (location.isEmpty()) {
                throw new BadRequestException("Моля, въведете точна локация при отписване.");
            }
            statusRepository.save(StudentStatus.unenrollmentRequest(student, location, command.signature()));
            events.publishEvent(new UnenrollmentRequestedEvent(
                    student.getEmail(), student.getFullName(), student.getDormitory(), location, staffEmails));
            return "Заявката е изпратена. Изчаква одобрение от възпитател или администратор.";
        }

        statusRepository.save(StudentStatus.enrolled(student));
        events.publishEvent(new EnrollmentConfirmedEvent(
                student.getEmail(), student.getFullName(), student.getDormitory(), staffEmails));
        return "Статусът е успешно актуализиран.";
    }

    @Override
    @Transactional
    public String reviewRequest(Long staffUserId, Long statusId, boolean approve, String reviewSignature) {
        User staff = requireStaff(staffUserId);
        if (statusId == null || statusId <= 0) {
            throw new BadRequestException("Липсва statusId.");
        }

        StudentStatus request = statusRepository.findByIdWithStudent(statusId)
                .filter(StudentStatus::isPending)
                .orElseThrow(() -> new NotFoundException("Заявката не е намерена или вече е обработена."));

        User student = request.getStudent();
        if (staff.getRole() == Role.COUNSELOR && staff.getDormitory() != student.getDormitory()) {
            throw new ForbiddenException("Нямате достъп до заявки от друго общежитие.");
        }
        if (reviewSignature == null || !reviewSignature.startsWith("data:image/")) {
            throw new BadRequestException("Подписът на възпитателя или администратора е задължителен.");
        }

        if (approve) {
            request.approve(staff, reviewSignature, dateTime.now());
        } else {
            request.reject(staff, reviewSignature, dateTime.now());
        }
        statusRepository.save(request);

        events.publishEvent(new UnenrollmentReviewedEvent(
                student.getEmail(), student.getFullName(), student.getDormitory(), request.getLocation(),
                staff.getFullName(), staff.getRole(), approve,
                userRepository.findStaffEmailsForDormitory(student.getDormitory())));

        return approve ? "Отписването е одобрено." : "Отписването е отказано.";
    }

    @Override
    @Transactional
    public BulkReviewOutcome bulkReview(Long staffUserId, List<Long> statusIds, boolean approve, String reviewSignature) {
        User staff = requireStaff(staffUserId);
        if (statusIds == null || statusIds.isEmpty()) {
            throw new BadRequestException("Изберете поне една заявка.");
        }
        if (reviewSignature == null || !reviewSignature.startsWith("data:image/")) {
            throw new BadRequestException("Подписът на възпитателя или администратора е задължителен.");
        }

        int processed = 0;
        int skipped = 0;
        for (Long statusId : statusIds.stream().filter(java.util.Objects::nonNull).distinct().toList()) {
            StudentStatus request = statusRepository.findByIdWithStudent(statusId)
                    .filter(StudentStatus::isPending)
                    .orElse(null);
            if (request == null) {
                skipped++;
                continue;
            }

            User student = request.getStudent();
            if (staff.getRole() == Role.COUNSELOR && staff.getDormitory() != student.getDormitory()) {
                skipped++;
                continue;
            }

            if (approve) {
                request.approve(staff, reviewSignature, dateTime.now());
            } else {
                request.reject(staff, reviewSignature, dateTime.now());
            }
            statusRepository.save(request);

            events.publishEvent(new UnenrollmentReviewedEvent(
                    student.getEmail(), student.getFullName(), student.getDormitory(), request.getLocation(),
                    staff.getFullName(), staff.getRole(), approve,
                    userRepository.findStaffEmailsForDormitory(student.getDormitory())));
            processed++;
        }
        return new BulkReviewOutcome(processed, skipped);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentStatus> getHistory(Long studentId, int limit) {
        return statusRepository.findHistory(studentId, Limit.of(limit));
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentStatus> getWeekRecords(Long staffUserId) {
        User staff = requireStaff(staffUserId);
        LocalDate today = LocalDate.now(zone);
        Instant start = today.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
                .atStartOfDay(zone).toInstant();
        Instant end = today.with(TemporalAdjusters.nextOrSame(java.time.DayOfWeek.SUNDAY))
                .atTime(23, 59, 59).atZone(zone).toInstant();
        String dormitory = staff.getRole() == Role.COUNSELOR && staff.getDormitory() != null
                ? staff.getDormitory().getValue() : null;
        return statusRepository.findLatestPerStudentInRange(start, end, dormitory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentStatus> getPendingRequests(Long staffUserId) {
        User staff = requireStaff(staffUserId);
        Dormitory dormitory = staff.getRole() == Role.COUNSELOR ? staff.getDormitory() : null;
        return statusRepository.findPendingRequests(dormitory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentStatus> getStudentAttendanceForMonth(Long studentId, LocalDate start, LocalDate end) {
        Instant from = start.atStartOfDay(zone).toInstant();
        Instant to = end.atTime(23, 59, 59).atZone(zone).toInstant();
        return statusRepository.findByStudentIdAndTimestampBetweenOrderByTimestampDesc(studentId, from, to);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OccupancyRow> getOccupancy(Long staffUserId) {
        User staff = requireStaff(staffUserId);
        String dormitory = staff.getRole() == Role.COUNSELOR && staff.getDormitory() != null
                ? staff.getDormitory().getValue() : null;
        return statusRepository.findOccupancyByDormitory(dormitory);
    }

    private EnrollmentStatus currentStatus(Long studentId) {
        return statusRepository.findEffectiveStatuses(studentId, Limit.of(1)).stream()
                .findFirst()
                .map(StudentStatus::getStatus)
                .orElse(null);
    }

    private User requireStaff(Long userId) {
        User user = userService.getCurrentUser(userId);
        if (!user.isStaff()) {
            throw new ForbiddenException("Само администратор или възпитател има достъп до това действие.");
        }
        return user;
    }
}

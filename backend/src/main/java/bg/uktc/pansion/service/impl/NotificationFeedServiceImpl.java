package bg.uktc.pansion.service.impl;

import bg.uktc.pansion.domain.entity.StudentStatus;
import bg.uktc.pansion.domain.entity.User;
import bg.uktc.pansion.domain.enums.ApprovalStatus;
import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.domain.enums.EnrollmentStatus;
import bg.uktc.pansion.domain.enums.Role;
import bg.uktc.pansion.repository.StudentStatusRepository;
import bg.uktc.pansion.service.NotificationFeedItem;
import bg.uktc.pansion.service.NotificationFeedService;
import bg.uktc.pansion.service.UserService;
import bg.uktc.pansion.service.support.DateTimeService;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class NotificationFeedServiceImpl implements NotificationFeedService {

    private final StudentStatusRepository statusRepository;
    private final UserService userService;
    private final DateTimeService dateTime;

    public NotificationFeedServiceImpl(StudentStatusRepository statusRepository,
                                       UserService userService,
                                       DateTimeService dateTime) {
        this.statusRepository = statusRepository;
        this.userService = userService;
        this.dateTime = dateTime;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationFeedItem> getFeed(Long userId) {
        User user = userService.getCurrentUser(userId);
        Instant now = dateTime.now();
        return user.isStaff() ? staffFeed(user, now) : studentFeed(user);
    }

    private List<NotificationFeedItem> staffFeed(User staff, Instant now) {
        Dormitory dormitory = staff.getRole() == Role.COUNSELOR ? staff.getDormitory() : null;
        List<NotificationFeedItem> items = new ArrayList<>();
        for (StudentStatus request : statusRepository.findPendingRequests(dormitory)) {
            long hours = Duration.between(request.getTimestamp(), now).toHours();
            String severity = hours >= 24 ? "warning" : "info";
            items.add(new NotificationFeedItem(
                    "pending-" + request.getId(),
                    "pending_request",
                    severity,
                    "Чакаща заявка за отписване",
                    request.getStudent().getFullName() + " — " + request.getLocation()
                            + " (подадена " + waitedLabel(hours) + ")",
                    request.getTimestamp()));
        }
        return items;
    }

    private List<NotificationFeedItem> studentFeed(User student) {
        StudentStatus latest = statusRepository.findHistory(student.getId(), Limit.of(1)).stream()
                .findFirst().orElse(null);
        if (latest == null) {
            return List.of();
        }

        String id = "status-" + latest.getId();
        Instant when = latest.getTimestamp();
        if (latest.getApprovalStatus() == ApprovalStatus.PENDING) {
            return List.of(new NotificationFeedItem(id, "request_status", "info",
                    "Заявката ви чака одобрение",
                    "Изчаква решение от възпитател или администратор.", when));
        }
        if (latest.getStatus() == EnrollmentStatus.ENROLLED) {
            return List.of(new NotificationFeedItem(id, "request_status", "success",
                    "Записани сте в общежитието", "Текущ статус: записан.", when));
        }
        if (latest.getApprovalStatus() == ApprovalStatus.REJECTED) {
            return List.of(new NotificationFeedItem(id, "request_status", "warning",
                    "Отписването ви е отказано",
                    "Заявката ви за отписване беше отказана.", when));
        }
        return List.of(new NotificationFeedItem(id, "request_status", "success",
                "Отписването ви е одобрено", "Заявката ви за отписване беше одобрена.", when));
    }

    private String waitedLabel(long hours) {
        if (hours < 1) {
            return "преди по-малко от час";
        }
        if (hours < 24) {
            return "преди " + hours + " ч.";
        }
        long days = hours / 24;
        return "преди " + days + (days == 1 ? " ден" : " дни");
    }
}

package bg.uktc.pansion.web.controller;

import bg.uktc.pansion.notification.NotificationService;
import bg.uktc.pansion.web.dto.response.MessageResponse;
import bg.uktc.pansion.web.dto.response.NotificationResponse;
import bg.uktc.pansion.web.mapper.ApiMapper;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@PreAuthorize("hasRole('ADMIN')")
public class NotificationController {

    private static final int RECENT_LIMIT = 25;

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> recent() {
        return notificationService.recentLogs(RECENT_LIMIT).stream()
                .map(ApiMapper::toNotification).toList();
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable Long id) {
        notificationService.deleteLog(id);
        return new MessageResponse("Известието е изтрито.");
    }

    @DeleteMapping
    public MessageResponse clear() {
        notificationService.clearLogs();
        return new MessageResponse("Логовете са изчистени.");
    }
}

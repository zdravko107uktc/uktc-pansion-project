package bg.uktc.pansion.web.controller;

import bg.uktc.pansion.security.AppUserPrincipal;
import bg.uktc.pansion.service.NotificationFeedService;
import bg.uktc.pansion.web.dto.response.NotificationFeedItemResponse;
import bg.uktc.pansion.web.mapper.ApiMapper;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Per-user in-app notification feed. Available to any authenticated user; the items returned depend
 * on the caller's role (see {@link NotificationFeedService}).
 */
@RestController
@RequestMapping("/api/v1/notifications/feed")
public class NotificationFeedController {

    private final NotificationFeedService feedService;

    public NotificationFeedController(NotificationFeedService feedService) {
        this.feedService = feedService;
    }

    @GetMapping
    public List<NotificationFeedItemResponse> feed(@AuthenticationPrincipal AppUserPrincipal principal) {
        return feedService.getFeed(principal.getId()).stream()
                .map(ApiMapper::toFeedItem)
                .toList();
    }
}

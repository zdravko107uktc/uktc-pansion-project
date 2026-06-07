package bg.uktc.pansion.service;

import java.util.List;

/**
 * Builds the per-user in-app notification feed: actionable reminders for staff (pending unenrollment
 * requests, oldest first) and status updates for students (their latest request outcome).
 */
public interface NotificationFeedService {

    List<NotificationFeedItem> getFeed(Long userId);
}

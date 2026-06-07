package bg.uktc.pansion.service;

import java.time.Instant;

/**
 * A single in-app notification, derived on the fly from current data (pending requests, latest
 * student status) rather than persisted. {@code severity} is one of "info", "warning" or "success".
 */
public record NotificationFeedItem(
        String id,
        String type,
        String severity,
        String title,
        String message,
        Instant createdAt
) {
}

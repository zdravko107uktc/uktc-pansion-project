package bg.uktc.pansion.web.dto.response;

import java.time.Instant;

public record NotificationFeedItemResponse(
        String id,
        String type,
        String severity,
        String title,
        String message,
        Instant created_at
) {
}

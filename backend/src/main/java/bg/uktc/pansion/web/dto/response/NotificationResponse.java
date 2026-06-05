package bg.uktc.pansion.web.dto.response;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        String recipient_email,
        String subject,
        String event_type,
        String status,
        String error_message,
        Instant created_at
) {
}

package bg.uktc.pansion.web.dto.response;

import java.time.Instant;
import java.time.LocalDate;

public record CalendarEventResponse(
        Long id,
        String title,
        String description,
        LocalDate event_date,
        LocalDate end_date,
        Instant created_at,
        String created_by_name
) {
}

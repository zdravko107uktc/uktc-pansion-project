package bg.uktc.pansion.web.dto.response;

import java.time.Instant;

public record AttendanceResponse(
        Long id,
        String status,
        String location,
        String signature,
        String approval_status,
        Instant approved_at,
        Instant timestamp
) {
}

package bg.uktc.pansion.web.dto.response;

import java.time.Instant;

public record WeekRecordResponse(
        Long id,
        Long status_id,
        String full_name,
        String email,
        String student_dormitory,
        String status,
        Instant timestamp,
        String location,
        String signature,
        String approval_status
) {
}

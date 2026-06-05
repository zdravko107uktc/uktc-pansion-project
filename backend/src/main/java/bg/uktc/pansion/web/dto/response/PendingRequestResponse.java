package bg.uktc.pansion.web.dto.response;

import java.time.Instant;

public record PendingRequestResponse(
        Long id,
        Long student_id,
        String full_name,
        String email,
        String student_dormitory,
        String location,
        String signature,
        String review_signature,
        Instant timestamp
) {
}

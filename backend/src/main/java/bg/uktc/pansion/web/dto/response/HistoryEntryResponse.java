package bg.uktc.pansion.web.dto.response;

import java.time.Instant;

public record HistoryEntryResponse(
        String status,
        String location,
        String signature,
        String review_signature,
        String approval_status,
        Instant approved_at,
        Instant timestamp,
        String approved_by_name,
        String approved_by_role
) {
}

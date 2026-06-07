package bg.uktc.pansion.web.dto.response;

import java.time.Instant;

/**
 * One row of the staff student roster. {@code current_status}/{@code approval_status}/{@code since}
 * are null when the student has never recorded a check-in/out.
 */
public record RosterEntryResponse(
        Long id,
        String full_name,
        String email,
        String dormitory,
        String current_status,
        String approval_status,
        Instant since
) {
}

package bg.uktc.pansion.web.dto.response;

import java.time.Instant;

/** Public user representation. Field names intentionally match the SPA's expected JSON keys. */
public record UserResponse(
        Long id,
        String full_name,
        String email,
        String role,
        String dormitory,
        boolean email_verified,
        Instant created_at
) {
}

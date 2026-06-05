package bg.uktc.pansion.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateUserRequest(
        @NotBlank(message = "Името е задължително.") String name,
        @NotBlank(message = "Имейлът е задължителен.") String email,
        String role,
        String dormitory
) {
}

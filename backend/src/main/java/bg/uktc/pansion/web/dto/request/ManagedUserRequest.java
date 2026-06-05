package bg.uktc.pansion.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ManagedUserRequest(
        @NotBlank(message = "Името е задължително.") String name,
        @NotBlank(message = "Имейлът е задължителен.") String email,
        @NotBlank(message = "Паролата е задължителна.") String password,
        String role,
        String dormitory
) {
}

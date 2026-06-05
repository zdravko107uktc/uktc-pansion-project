package bg.uktc.pansion.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Имейлът е задължителен.") String email,
        @NotBlank(message = "Паролата е задължителна.") String password
) {
}

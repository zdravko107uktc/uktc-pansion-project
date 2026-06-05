package bg.uktc.pansion.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PasswordResetRequest(
        @NotBlank(message = "Моля, въведете имейл адрес.") String email
) {
}

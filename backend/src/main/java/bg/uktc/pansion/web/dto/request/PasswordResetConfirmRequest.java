package bg.uktc.pansion.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PasswordResetConfirmRequest(
        @NotBlank(message = "Липсва токен за смяна на парола.") String token,
        @NotBlank(message = "Моля, въведете нова парола.") String password
) {
}

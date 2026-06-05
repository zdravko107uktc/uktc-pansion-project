package bg.uktc.pansion.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record VerifyEmailRequest(
        @NotBlank(message = "Липсва токен за потвърждение.") String token
) {
}

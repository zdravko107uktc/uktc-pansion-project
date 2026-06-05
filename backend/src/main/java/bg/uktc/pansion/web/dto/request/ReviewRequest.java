package bg.uktc.pansion.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ReviewRequest(
        @NotBlank(message = "Подписът на възпитателя или администратора е задължителен.") String reviewSignature
) {
}

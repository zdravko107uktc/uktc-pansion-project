package bg.uktc.pansion.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record StatusChangeRequest(
        @NotBlank(message = "Невалиден статус.") String status,
        String location,
        String signature
) {
}

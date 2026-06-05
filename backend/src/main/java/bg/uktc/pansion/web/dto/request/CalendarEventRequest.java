package bg.uktc.pansion.web.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CalendarEventRequest(
        @NotBlank(message = "Заглавието е задължително.") String title,
        String description,
        @NotBlank(message = "Датата е задължителна.") String eventDate,
        String endDate
) {
}

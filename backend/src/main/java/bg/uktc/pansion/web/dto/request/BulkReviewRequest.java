package bg.uktc.pansion.web.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Approve or reject several pending unenrollment requests at once. The reviewer signs once and the
 * same signature is applied to every selected request.
 */
public record BulkReviewRequest(
        @NotEmpty(message = "Изберете поне една заявка.") List<Long> statusIds,
        @NotBlank(message = "Подписът на възпитателя или администратора е задължителен.") String reviewSignature
) {
}

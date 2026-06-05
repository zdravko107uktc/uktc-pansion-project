package bg.uktc.pansion.web.dto.response;

/** Response for create/update user operations. */
public record UserSaveResponse(String message, UserResponse user) {
}

package bg.uktc.pansion.web.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record RegisterResponse(String message, String token, UserResponse user) {
}

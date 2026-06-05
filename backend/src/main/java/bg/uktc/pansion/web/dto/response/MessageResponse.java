package bg.uktc.pansion.web.dto.response;

/** Generic {@code {"message": "..."}} envelope used across the API and by the SPA error handler. */
public record MessageResponse(String message) {
}

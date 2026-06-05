package bg.uktc.pansion.exception;

import org.springframework.http.HttpStatus;

/**
 * Base type for all expected, client-facing errors. Carries the HTTP status that the
 * {@link GlobalExceptionHandler} should translate it into, mirroring the legacy {@code ApiException}.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}

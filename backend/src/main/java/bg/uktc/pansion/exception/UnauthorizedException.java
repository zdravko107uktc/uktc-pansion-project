package bg.uktc.pansion.exception;

import org.springframework.http.HttpStatus;

/** HTTP 401 - authentication is missing or invalid. */
public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(message, HttpStatus.UNAUTHORIZED);
    }
}

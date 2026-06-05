package bg.uktc.pansion.exception;

import org.springframework.http.HttpStatus;

/** HTTP 429 - rate limited (e.g. too many failed login attempts). */
public class TooManyRequestsException extends ApiException {

    public TooManyRequestsException(String message) {
        super(message, HttpStatus.TOO_MANY_REQUESTS);
    }
}

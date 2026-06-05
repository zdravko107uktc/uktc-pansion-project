package bg.uktc.pansion.exception;

import org.springframework.http.HttpStatus;

/** HTTP 409 - the request conflicts with the current state (e.g. duplicate email). */
public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}

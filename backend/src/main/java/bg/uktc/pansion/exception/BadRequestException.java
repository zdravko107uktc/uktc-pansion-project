package bg.uktc.pansion.exception;

import org.springframework.http.HttpStatus;

/** HTTP 400 - the request was understood but is invalid. */
public class BadRequestException extends ApiException {

    public BadRequestException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}

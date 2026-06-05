package bg.uktc.pansion.exception;

import org.springframework.http.HttpStatus;

/** HTTP 404 - the requested resource does not exist. */
public class NotFoundException extends ApiException {

    public NotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}

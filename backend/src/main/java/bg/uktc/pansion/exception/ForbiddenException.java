package bg.uktc.pansion.exception;

import org.springframework.http.HttpStatus;

/** HTTP 403 - the caller is authenticated but not allowed to perform this action. */
public class ForbiddenException extends ApiException {

    public ForbiddenException(String message) {
        super(message, HttpStatus.FORBIDDEN);
    }
}

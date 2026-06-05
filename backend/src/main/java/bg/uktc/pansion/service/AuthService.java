package bg.uktc.pansion.service;

import bg.uktc.pansion.service.command.RegisterCommand;

/** Authentication use-cases: self-registration and login. */
public interface AuthService {

    RegistrationResult register(RegisterCommand command);

    /** @return a signed access token on success. */
    String login(String email, String password, String ipAddress);
}

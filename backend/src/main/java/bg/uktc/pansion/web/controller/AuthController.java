package bg.uktc.pansion.web.controller;

import bg.uktc.pansion.service.AuthService;
import bg.uktc.pansion.service.EmailVerificationService;
import bg.uktc.pansion.service.PasswordResetService;
import bg.uktc.pansion.service.RegistrationResult;
import bg.uktc.pansion.service.command.RegisterCommand;
import bg.uktc.pansion.web.dto.request.LoginRequest;
import bg.uktc.pansion.web.dto.request.PasswordResetConfirmRequest;
import bg.uktc.pansion.web.dto.request.PasswordResetRequest;
import bg.uktc.pansion.web.dto.request.RegisterRequest;
import bg.uktc.pansion.web.dto.request.VerifyEmailRequest;
import bg.uktc.pansion.web.dto.response.LoginResponse;
import bg.uktc.pansion.web.dto.response.MessageResponse;
import bg.uktc.pansion.web.dto.response.RegisterResponse;
import bg.uktc.pansion.web.mapper.ApiMapper;
import bg.uktc.pansion.web.mapper.RequestParser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public authentication endpoints (no token required). */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final EmailVerificationService emailVerificationService;

    public AuthController(AuthService authService,
                         PasswordResetService passwordResetService,
                         EmailVerificationService emailVerificationService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.emailVerificationService = emailVerificationService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String token = authService.login(request.email(), request.password(), clientIp(httpRequest));
        return new LoginResponse("Входът е успешен.", token);
    }

    @PostMapping("/register")
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        RegistrationResult result = authService.register(new RegisterCommand(
                request.name(), request.email(), request.password(),
                RequestParser.dormitory(request.dormitory())));
        return new RegisterResponse(
                result.message(), result.accessToken(), ApiMapper.toUserResponse(result.user()));
    }

    @PostMapping("/password-reset/request")
    public MessageResponse requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        return new MessageResponse(passwordResetService.requestReset(request.email()));
    }

    @PostMapping("/password-reset/confirm")
    public MessageResponse confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        passwordResetService.resetPassword(request.token(), request.password());
        return new MessageResponse("Паролата беше сменена успешно.");
    }

    @PostMapping("/verify-email")
    public MessageResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        emailVerificationService.verify(request.token());
        return new MessageResponse("Имейлът е потвърден успешно. Вече можете да влезете.");
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

package bg.uktc.pansion.service.support;

import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Server-side mirror of the SPA's field rules. Centralising them here means the same Bulgarian
 * messages and constraints are enforced regardless of which endpoint is the entry point (SRP).
 */
@Component
public class InputValidator {

    private static final Pattern NAME_PATTERN = Pattern.compile("^[\\p{L}\\s\\-]+$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");

    public void validateFullName(String name) {
        if (name == null || name.codePointCount(0, name.length()) < 3) {
            throw new BadRequestException("Името трябва да е поне 3 символа.");
        }
        if (name.codePointCount(0, name.length()) > 100) {
            throw new BadRequestException("Името не може да е повече от 100 символа.");
        }
        if (!NAME_PATTERN.matcher(name).matches()) {
            throw new BadRequestException("Името може да съдържа само букви, интервали и тирета.");
        }
        long words = java.util.Arrays.stream(name.trim().split("\\s+"))
                .filter(part -> !part.isBlank())
                .count();
        if (words < 2) {
            throw new BadRequestException("Въведете собствено и фамилно име.");
        }
    }

    public void validateEmail(String email) {
        if (email == null || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new BadRequestException("Невалиден имейл адрес.");
        }
    }

    public void validateDormitory(Dormitory dormitory) {
        if (dormitory == null) {
            throw new BadRequestException("Изберете валидно общежитие.");
        }
    }
}

package bg.uktc.pansion.web.mapper;

import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.domain.enums.EnrollmentStatus;
import bg.uktc.pansion.domain.enums.Role;
import bg.uktc.pansion.exception.BadRequestException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/** Parses raw request strings into domain types, raising friendly errors on malformed input. */
public final class RequestParser {

    private RequestParser() {
    }

    public static Dormitory dormitory(String value) {
        return Dormitory.fromValue(value);
    }

    public static Role role(String value) {
        return Role.fromValue(value);
    }

    public static EnrollmentStatus enrollmentStatus(String value) {
        if (value == null) {
            throw new BadRequestException("Невалиден статус.");
        }
        try {
            return EnrollmentStatus.fromValue(value);
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Невалиден статус.");
        }
    }

    public static LocalDate requiredDate(String value) {
        LocalDate parsed = optionalDate(value);
        if (parsed == null) {
            throw new BadRequestException("Невалиден формат на дата.");
        }
        return parsed;
    }

    public static LocalDate optionalDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException exception) {
            throw new BadRequestException("Невалиден формат на дата.");
        }
    }
}

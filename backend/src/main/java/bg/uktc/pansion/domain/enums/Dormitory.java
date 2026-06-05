package bg.uktc.pansion.domain.enums;

import java.util.Arrays;

/** The two dormitory buildings managed by the system. */
public enum Dormitory implements PersistableEnum {
    ONE("1"),
    TWO("2");

    private final String value;

    Dormitory(String value) {
        this.value = value;
    }

    @Override
    public String getValue() {
        return value;
    }

    public static Dormitory fromValue(String value) {
        if (value == null) {
            return null;
        }
        return Arrays.stream(values())
                .filter(dormitory -> dormitory.value.equals(value.trim()))
                .findFirst()
                .orElse(null);
    }
}

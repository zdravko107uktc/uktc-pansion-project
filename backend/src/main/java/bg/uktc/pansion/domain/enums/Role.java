package bg.uktc.pansion.domain.enums;

import java.util.Arrays;

/** System roles. The system admin email is always resolved to {@link #ADMIN}. */
public enum Role implements PersistableEnum {
    ADMIN("admin"),
    COUNSELOR("counselor"),
    STUDENT("student");

    private final String value;

    Role(String value) {
        this.value = value;
    }

    @Override
    public String getValue() {
        return value;
    }

    public boolean isStaff() {
        return this == ADMIN || this == COUNSELOR;
    }

    public static Role fromValue(String value) {
        return Arrays.stream(values())
                .filter(role -> role.value.equalsIgnoreCase(value))
                .findFirst()
                .orElse(STUDENT);
    }
}

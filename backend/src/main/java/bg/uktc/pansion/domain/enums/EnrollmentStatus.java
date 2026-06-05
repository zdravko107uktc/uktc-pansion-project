package bg.uktc.pansion.domain.enums;

import java.util.Arrays;

/** Whether a student is currently present (enrolled) in the dormitory or has checked out. */
public enum EnrollmentStatus implements PersistableEnum {
    ENROLLED("enrolled"),
    UNENROLLED("unenrolled");

    private final String value;

    EnrollmentStatus(String value) {
        this.value = value;
    }

    @Override
    public String getValue() {
        return value;
    }

    public static EnrollmentStatus fromValue(String value) {
        return Arrays.stream(values())
                .filter(status -> status.value.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown enrollment status: " + value));
    }
}

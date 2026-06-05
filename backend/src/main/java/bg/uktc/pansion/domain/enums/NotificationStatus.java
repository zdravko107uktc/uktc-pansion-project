package bg.uktc.pansion.domain.enums;

import java.util.Arrays;

/** Delivery outcome recorded for every outbound email in the audit log. */
public enum NotificationStatus implements PersistableEnum {
    SENT("sent"),
    FAILED("failed"),
    LOGGED("logged");

    private final String value;

    NotificationStatus(String value) {
        this.value = value;
    }

    @Override
    public String getValue() {
        return value;
    }

    public static NotificationStatus fromValue(String value) {
        return Arrays.stream(values())
                .filter(status -> status.value.equalsIgnoreCase(value))
                .findFirst()
                .orElse(LOGGED);
    }
}

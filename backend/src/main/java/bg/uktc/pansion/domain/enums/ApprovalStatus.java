package bg.uktc.pansion.domain.enums;

import java.util.Arrays;

/** Lifecycle of an unenrollment request that requires staff review. */
public enum ApprovalStatus implements PersistableEnum {
    PENDING("pending"),
    APPROVED("approved"),
    REJECTED("rejected");

    private final String value;

    ApprovalStatus(String value) {
        this.value = value;
    }

    @Override
    public String getValue() {
        return value;
    }

    public static ApprovalStatus fromValue(String value) {
        return Arrays.stream(values())
                .filter(status -> status.value.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown approval status: " + value));
    }
}

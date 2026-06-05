package bg.uktc.pansion.domain.enums;

/**
 * Contract for enums whose persisted representation differs from their Java constant name.
 * Enables a single generic JPA converter strategy instead of one converter per enum.
 */
public interface PersistableEnum {

    /** @return the value stored in the database column. */
    String getValue();
}

package bg.uktc.pansion.service.support;

import bg.uktc.pansion.config.properties.AppProperties;
import bg.uktc.pansion.domain.enums.Role;
import org.springframework.stereotype.Component;

/**
 * Central authority for role assignment rules (replaces the legacy {@code SystemRoles} helpers).
 *
 * <p>The configured system-admin email is always promoted to {@link Role#ADMIN}; any other email
 * may only be a {@link Role#STUDENT} or {@link Role#COUNSELOR}. Keeping this in one place satisfies
 * the Single Responsibility Principle and avoids the rule drifting across the codebase.</p>
 */
@Component
public class RolePolicy {

    private final AppProperties appProperties;

    public RolePolicy(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    public boolean isSystemAdminEmail(String email) {
        return normalizeEmail(email).equals(appProperties.systemAdminEmail());
    }

    public String systemAdminEmail() {
        return appProperties.systemAdminEmail();
    }

    /** Role for a brand-new self-registration: admin only for the system email, otherwise student. */
    public Role roleForSelfRegistration(String email) {
        return isSystemAdminEmail(email) ? Role.ADMIN : Role.STUDENT;
    }

    /** Role for an admin-managed create/update, clamped to what the email is allowed to be. */
    public Role normalizeManagedRole(Role requested, String email) {
        if (isSystemAdminEmail(email)) {
            return Role.ADMIN;
        }
        if (requested == Role.COUNSELOR) {
            return Role.COUNSELOR;
        }
        return Role.STUDENT;
    }

    /** The role the account should currently have, used to self-heal drifted roles. */
    public Role expectedRole(String email, Role currentRole) {
        if (isSystemAdminEmail(email)) {
            return Role.ADMIN;
        }
        return normalizeManagedRole(currentRole, email);
    }
}

package bg.uktc.pansion.service.support;

import bg.uktc.pansion.config.properties.AppProperties;
import bg.uktc.pansion.domain.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RolePolicyTest {

    private RolePolicy rolePolicy;

    @BeforeEach
    void setUp() {
        rolePolicy = new RolePolicy(new AppProperties("admin@uktc.bg", "http://localhost:8080", "Europe/Sofia"));
    }

    @Test
    void systemAdminEmailIsAlwaysAdmin() {
        assertThat(rolePolicy.roleForSelfRegistration("ADMIN@uktc.bg")).isEqualTo(Role.ADMIN);
        assertThat(rolePolicy.normalizeManagedRole(Role.STUDENT, "admin@uktc.bg")).isEqualTo(Role.ADMIN);
        assertThat(rolePolicy.isSystemAdminEmail("  Admin@UKTC.bg ")).isTrue();
    }

    @Test
    void othersDefaultToStudentUnlessCounselor() {
        assertThat(rolePolicy.roleForSelfRegistration("kid@uktc.bg")).isEqualTo(Role.STUDENT);
        assertThat(rolePolicy.normalizeManagedRole(Role.ADMIN, "kid@uktc.bg")).isEqualTo(Role.STUDENT);
        assertThat(rolePolicy.normalizeManagedRole(Role.COUNSELOR, "kid@uktc.bg")).isEqualTo(Role.COUNSELOR);
    }

    @Test
    void expectedRoleHealsSystemAdmin() {
        assertThat(rolePolicy.expectedRole("admin@uktc.bg", Role.STUDENT)).isEqualTo(Role.ADMIN);
        assertThat(rolePolicy.expectedRole("kid@uktc.bg", Role.COUNSELOR)).isEqualTo(Role.COUNSELOR);
    }
}

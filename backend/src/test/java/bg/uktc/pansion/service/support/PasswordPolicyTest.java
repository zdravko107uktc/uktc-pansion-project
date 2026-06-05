package bg.uktc.pansion.service.support;

import bg.uktc.pansion.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyTest {

    // validateStrength is pure (no collaborators), so nulls are fine for this slice.
    private final PasswordPolicy passwordPolicy = new PasswordPolicy(null, null, null);

    @Test
    void acceptsAStrongPassword() {
        assertThatCode(() -> passwordPolicy.validateStrength("Str0ng!Pass1")).doesNotThrowAnyException();
    }

    @Test
    void rejectsWeakPasswords() {
        assertThatThrownBy(() -> passwordPolicy.validateStrength("short1!A"))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> passwordPolicy.validateStrength("alllowercase1!"))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> passwordPolicy.validateStrength("NoDigitsHere!"))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> passwordPolicy.validateStrength("NoSpecial123"))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> passwordPolicy.validateStrength("Has Space1!"))
                .isInstanceOf(BadRequestException.class);
    }
}

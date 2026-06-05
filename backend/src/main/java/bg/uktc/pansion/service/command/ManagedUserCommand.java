package bg.uktc.pansion.service.command;

import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.domain.enums.Role;

/** Input for an admin creating a managed user. */
public record ManagedUserCommand(
        String name,
        String email,
        String password,
        Role role,
        Dormitory dormitory
) {
}

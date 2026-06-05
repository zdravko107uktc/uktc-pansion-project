package bg.uktc.pansion.service.command;

import bg.uktc.pansion.domain.enums.Dormitory;
import bg.uktc.pansion.domain.enums.Role;

/** Input for an admin updating an existing user's profile. */
public record UpdateUserCommand(
        Long userId,
        String name,
        String email,
        Role role,
        Dormitory dormitory
) {
}

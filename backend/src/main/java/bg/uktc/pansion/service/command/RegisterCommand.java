package bg.uktc.pansion.service.command;

import bg.uktc.pansion.domain.enums.Dormitory;

/** Input for a public self-registration. */
public record RegisterCommand(
        String name,
        String email,
        String password,
        Dormitory dormitory
) {
}

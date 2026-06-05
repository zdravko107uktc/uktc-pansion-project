package bg.uktc.pansion.service;

import bg.uktc.pansion.domain.entity.User;
import bg.uktc.pansion.service.command.ManagedUserCommand;
import bg.uktc.pansion.service.command.RegisterCommand;
import bg.uktc.pansion.service.command.UpdateUserCommand;

import java.util.List;

/** User lifecycle and queries. Role assignment rules are delegated to {@code RolePolicy}. */
public interface UserService {

    User getById(Long id);

    /** Returns the user, self-healing a drifted role (e.g. system admin email always admin). */
    User getCurrentUser(Long id);

    List<User> listAll();

    User register(RegisterCommand command);

    User createManagedUser(ManagedUserCommand command);

    User updateUser(UpdateUserCommand command);

    void deleteUser(Long targetUserId, Long actingUserId);
}

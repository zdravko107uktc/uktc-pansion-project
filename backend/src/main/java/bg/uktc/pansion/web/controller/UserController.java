package bg.uktc.pansion.web.controller;

import bg.uktc.pansion.security.AppUserPrincipal;
import bg.uktc.pansion.service.UserService;
import bg.uktc.pansion.service.command.ManagedUserCommand;
import bg.uktc.pansion.service.command.UpdateUserCommand;
import bg.uktc.pansion.web.dto.request.ManagedUserRequest;
import bg.uktc.pansion.web.dto.request.UpdateUserRequest;
import bg.uktc.pansion.web.dto.response.MessageResponse;
import bg.uktc.pansion.web.dto.response.UserInfoResponse;
import bg.uktc.pansion.web.dto.response.UserResponse;
import bg.uktc.pansion.web.dto.response.UserSaveResponse;
import bg.uktc.pansion.web.mapper.ApiMapper;
import bg.uktc.pansion.web.mapper.RequestParser;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserInfoResponse currentUser(@AuthenticationPrincipal AppUserPrincipal principal) {
        return new UserInfoResponse(ApiMapper.toUserResponse(userService.getCurrentUser(principal.getId())));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> listUsers() {
        return userService.listAll().stream().map(ApiMapper::toUserResponse).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public UserSaveResponse createUser(@Valid @RequestBody ManagedUserRequest request) {
        var created = userService.createManagedUser(new ManagedUserCommand(
                request.name(), request.email(), request.password(),
                RequestParser.role(request.role()), RequestParser.dormitory(request.dormitory())));
        return new UserSaveResponse("Потребителят е създаден успешно.", ApiMapper.toUserResponse(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserSaveResponse updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        var updated = userService.updateUser(new UpdateUserCommand(
                id, request.name(), request.email(),
                RequestParser.role(request.role()), RequestParser.dormitory(request.dormitory())));
        return new UserSaveResponse("Потребителят е обновен успешно.", ApiMapper.toUserResponse(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public MessageResponse deleteUser(@PathVariable Long id, @AuthenticationPrincipal AppUserPrincipal principal) {
        userService.deleteUser(id, principal.getId());
        return new MessageResponse("Потребителят е изтрит успешно.");
    }
}

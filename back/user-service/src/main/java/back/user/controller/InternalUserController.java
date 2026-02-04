package back.user.controller;

import back.user.dto.InternalUserDTO;
import back.user.model.User;
import back.user.model.enums.UserRole;
import back.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/users")
public class InternalUserController {
    private final UserService userService;

    public InternalUserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/by-email")
    public ResponseEntity<?> getByEmail(@RequestParam String email) {
        User user = userService.getUserByEmail(email);
        if (user == null) {
            return ResponseEntity.status(404).body("{\"error\":\"User not found\"}");
        }
        InternalUserDTO dto = new InternalUserDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getPassword(),
                user.getStringRole());
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody User formData) {
        if (formData.getEmail() == null || formData.getEmail().isEmpty()) {
            return ResponseEntity.status(400).body("{\"error\":\"Email не может быть пустым.\"}");
        }
        if (userService.getUserByEmail(formData.getEmail()) != null) {
            return ResponseEntity.status(409).body("{\"error\":\"Email занят. Попробуйте другой.\"}");
        }

        User newUser = new User(formData.getName(), formData.getEmail(), formData.getPassword());
        newUser.setPhoneNumber(formData.getPhoneNumber());
        newUser.setRole(formData.getRole() != null ? formData.getRole() : UserRole.PARTICIPANT);
        User created = userService.createUser(newUser);

        InternalUserDTO dto = new InternalUserDTO(
                created.getId(),
                created.getName(),
                created.getEmail(),
                created.getPhoneNumber(),
                created.getPassword(),
                created.getStringRole());
        return ResponseEntity.ok(dto);
    }
}

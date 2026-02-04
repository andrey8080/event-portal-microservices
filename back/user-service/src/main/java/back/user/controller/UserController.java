package back.user.controller;

import back.user.dto.UserDTO;
import back.user.model.User;
import back.user.model.enums.UserRole;
import back.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequestMapping("/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PatchMapping("/me")
    public ResponseEntity<?> updateMe(@RequestHeader("Authorization") String token, @RequestBody User formData) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);

        if (!userService.checkValidToken(tokenWithoutPrefix)) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String emailFromToken = userService.extractEmail(tokenWithoutPrefix);
        User user = userService.getUserByEmail(emailFromToken);
        if (user == null) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        if (formData.getName() != null) {
            user.setName(formData.getName());
        }
        if (formData.getEmail() != null) {
            user.setEmail(formData.getEmail());
        }
        if (formData.getPhoneNumber() != null) {
            user.setPhoneNumber(formData.getPhoneNumber());
        }
        if (formData.getPassword() != null) {
            user.setPassword(formData.getPassword());
        }
        userService.updateUser(tokenWithoutPrefix, user);
        System.out.println(">> Данные пользователя обновлены: " + user.getId() + ", " + user.getName());
        return ResponseEntity.ok("{\"message\":\"Данные успешно изменены\"}");
    }

    @PutMapping("/me/role")
    public ResponseEntity<?> becomeOrganizer(@RequestHeader("Authorization") String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);

        if (!userService.checkValidToken(tokenWithoutPrefix)) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String emailFromToken = userService.extractEmail(tokenWithoutPrefix);
        User user = userService.getUserByEmail(emailFromToken);
        if (user == null) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        user.setRole(UserRole.ORGANIZER);
        userService.updateUser(tokenWithoutPrefix, user);
        System.out.println(">> Пользователь стал организатором: " + user.getId() + ", " + user.getName());
        return ResponseEntity.ok("{\"message\":\"Вы стали организатором\"}");
    }

    @DeleteMapping
    public ResponseEntity<?> deleteUserByEmail(@RequestHeader("Authorization") String token,
            @RequestParam String email) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        if (!userService.checkValidToken(tokenWithoutPrefix)) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String emailFromToken = userService.extractEmail(tokenWithoutPrefix);
        User user = userService.getUserByEmail(emailFromToken);
        if (user == null) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        UserRole role = user.getRole();
        if (!UserRole.ADMIN.equals(role)) {
            return ResponseEntity.status(403).body("{\"error\":\"Недостаточно прав для удаления аккаунта\"}");
        }
        userService.deleteUserByEmail(email);
        return ResponseEntity.ok("{\"message\":\"Аккаунт успешно удален\"}");
    }

    @GetMapping
    public ResponseEntity<?> getUser(@RequestHeader("Authorization") String token, @RequestParam String email) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }
        String tokenWithoutPrefix = token.substring(7);

        if (!userService.checkValidToken(tokenWithoutPrefix)) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }

        String emailFromToken = userService.extractEmail(tokenWithoutPrefix);
        User currentUser = userService.getUserByEmail(emailFromToken);
        if (currentUser == null) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }

        if (!UserRole.ADMIN.equals(currentUser.getRole()) && !currentUser.getEmail().equals(email)) {
            return ResponseEntity.status(403)
                    .body("{\"error\":\"Недостаточно прав для просмотра данных другого пользователя\"}");
        }

        User requestedUser = userService.getUserByEmail(email);
        if (requestedUser == null) {
            return ResponseEntity.status(404).body("{\"error\":\"Пользователь не найден\"}");
        }

        UserDTO userDTO = new UserDTO(requestedUser.getId(), requestedUser.getName(), requestedUser.getEmail(),
                requestedUser.getPhoneNumber());
        return ResponseEntity.ok(userDTO);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@RequestHeader("Authorization") String token, @PathVariable int id) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Null token\"}");
        }

        String tokenWithoutPrefix = token.substring(7);
        if (!userService.checkValidToken(tokenWithoutPrefix)) {
            return ResponseEntity.status(401).body("{\"error\":\"Неверный или просроченный токен\"}");
        }

        User requestedUser = userService.getUserById(id);
        if (requestedUser == null) {
            return ResponseEntity.status(404).body("{\"error\":\"Пользователь не найден\"}");
        }

        UserDTO userDTO = new UserDTO(requestedUser.getId(), requestedUser.getName(), requestedUser.getEmail(),
                requestedUser.getPhoneNumber());
        return ResponseEntity.ok(userDTO);
    }
}

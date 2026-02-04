package back.auth.controller;

import back.auth.model.InternalUserDTO;
import back.auth.model.SigninRequest;
import back.auth.model.UserSignupRequest;
import back.auth.service.UserServiceClient;
import back.auth.util.JwtTokenUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequestMapping("/auth")
public class AuthController {
    private final JwtTokenUtil jwtTokenUtil;
    private final UserServiceClient userServiceClient;

    public AuthController(JwtTokenUtil jwtTokenUtil, UserServiceClient userServiceClient) {
        this.jwtTokenUtil = jwtTokenUtil;
        this.userServiceClient = userServiceClient;
    }

    @PostMapping("/signin")
    public ResponseEntity<?> signinForm(@RequestBody SigninRequest request) {
        if (request == null || request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.status(400).body(Map.of("error", "Некорректные данные"));
        }
        String email = request.getEmail();
        String password = request.getPassword();
        try {
            InternalUserDTO user = userServiceClient.getByEmail(email);
            if (user != null && user.getPassword() != null && user.getPassword().equals(password)) {
                String jwtToken = jwtTokenUtil.generateJwtToken(user.getEmail());
                return ResponseEntity.ok(Map.of("token", jwtToken));
            }
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        } catch (HttpClientErrorException.NotFound e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signupForm(@RequestBody UserSignupRequest formData) {
        if (formData.getEmail() == null || formData.getEmail().isEmpty()) {
            return ResponseEntity.status(400).body("{\"error\":\"Email не может быть пустым.\"}");
        }

        try {
            InternalUserDTO created = userServiceClient.createUser(formData);
            String jwtToken = jwtTokenUtil.generateJwtToken(created.getEmail());
            return ResponseEntity.ok("{\"token\":\"" + jwtToken + "\"}");
        } catch (HttpClientErrorException.Conflict e) {
            return ResponseEntity.status(409).body("{\"error\":\"Email занят. Попробуйте другой.\"}");
        } catch (HttpClientErrorException.BadRequest e) {
            return ResponseEntity.status(400).body("{\"error\":\"Некорректные данные\"}");
        }
    }

    @PostMapping("/verify-token")
    public ResponseEntity<?> checkToken(@RequestHeader("Authorization") String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Null token\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        if (!jwtTokenUtil.validateJwtToken(tokenWithoutPrefix)) {
            return ResponseEntity.status(401).body("{\"error\":\"Invalid or expired token\"}");
        }
        String email = jwtTokenUtil.getEmailFromJwtToken(tokenWithoutPrefix);
        if (email == null) {
            return ResponseEntity.status(401).body("{\"error\":\"Invalid or expired token\"}");
        }

        try {
            InternalUserDTO user = userServiceClient.getByEmail(email);
            return ResponseEntity.ok("{\"role\":\"" + user.getRole() + "\"}");
        } catch (HttpClientErrorException.NotFound e) {
            return ResponseEntity.status(401).body("{\"error\":\"Invalid or expired token\"}");
        }
    }
}

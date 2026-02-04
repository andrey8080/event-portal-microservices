package back.event.service;

import back.event.model.User;
import back.event.model.enums.UserRole;
import back.event.util.JwtTokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final JwtTokenUtil jwtTokenUtil;
    private final JdbcTemplate jdbcTemplate;

    public UserService(JwtTokenUtil jwtTokenUtil, JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.jwtTokenUtil = jwtTokenUtil;
    }

    public User getUserByEmail(String email) {
        String sql = "SELECT * FROM \"User\" WHERE LOWER(\"email\") = LOWER(?)";
        try {
            return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> new User(
                    rs.getInt("ID"),
                    rs.getString("name"),
                    rs.getString("email"),
                    rs.getString("phoneNumber"),
                    rs.getString("password"),
                    UserRole.fromString(rs.getString("role"))), email.trim().toLowerCase());
        } catch (EmptyResultDataAccessException e) {
            logger.error("User not found with email: {}", email);
            return null;
        }
    }

    public boolean checkValidToken(String token) {
        try {
            boolean validToken = jwtTokenUtil.validateJwtToken(token);
            System.out.println(">> Токен " + (validToken ? "валиден" : "не валиден") + ": "
                    + token.substring(0, Math.min(token.length(), 15)) + "...");
            return validToken;
        } catch (Exception e) {
            logger.error("Token validation failed: {}", e.getMessage());
            System.out.println(">> Ошибка проверки токена: " + e.getMessage());
            return false;
        }
    }

    public String extractEmail(String token) {
        if (!jwtTokenUtil.validateJwtToken(token)) {
            System.out.println(">> Токен не валиден при извлечении email");
            return null;
        }

        try {
            String email = jwtTokenUtil.getEmailFromJwtToken(token);
            System.out.println(">> Извлечен email: " + email);
            return email;
        } catch (Exception e) {
            logger.error("Failed to extract email from token: {}", e.getMessage());
            System.out.println(">> Ошибка извлечения email из токена: " + e.getMessage());
            return null;
        }
    }

    public String getUserRole(String token) {
        String email = extractEmail(token);
        if (email == null) {
            return null;
        }

        User user = getUserByEmail(email);
        return user != null ? user.getStringRole() : null;
    }
}

package back.user.service;

import back.user.model.User;
import back.user.model.enums.UserRole;
import back.user.util.JwtTokenUtil;
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

    public User createUser(User user) {
        String normalizedEmail = user.getEmail().trim().toLowerCase();
        String normalizedPhoneNumber = normalizeOptionalString(user.getPhoneNumber());

        String checkUserSql = "SELECT COUNT(*) FROM \"User\" WHERE LOWER(\"email\") = LOWER(?)";
        Integer count = jdbcTemplate.queryForObject(checkUserSql, Integer.class, normalizedEmail);

        if (count != null && count > 0) {
            logger.warn("User already exists with email: {}", normalizedEmail);
            throw new IllegalStateException("Пользователь с таким email уже существует");
        }

        String insertSql = "INSERT INTO \"User\" (\"name\", \"email\", \"phoneNumber\", \"password\", \"role\") VALUES (?, ?, ?, ?, ?) RETURNING \"ID\"";
        Integer id = jdbcTemplate.queryForObject(
                insertSql,
                Integer.class,
                user.getName(),
                normalizedEmail,
                normalizedPhoneNumber,
                user.getPassword(),
                user.getStringRole());

        User created = getUserByEmail(normalizedEmail);
        if (created != null) {
            return created;
        }

        User fallback = new User();
        fallback.setId(id != null ? id : 0);
        fallback.setName(user.getName());
        fallback.setEmail(normalizedEmail);
        fallback.setPhoneNumber(normalizedPhoneNumber);
        fallback.setPassword(user.getPassword());
        fallback.setRole(user.getRole());
        return fallback;
    }

    public void updateUser(String token, User user) {
        String emailFromToken = extractEmail(token);

        String checkUserSql = "SELECT COUNT(*) FROM \"User\" WHERE LOWER(\"email\") = LOWER(?)";
        Integer count = jdbcTemplate.queryForObject(checkUserSql, Integer.class, emailFromToken);

        if (count == null || count == 0) {
            logger.warn("User not found with email: {}", emailFromToken);
            throw new IllegalStateException("Пользователь с таким email не найден");
        }

        String updateSql = "UPDATE \"User\" SET \"name\" = ?, \"email\" = ?, \"phoneNumber\" = ?, \"password\" = ?, \"role\" = ? WHERE LOWER(\"email\") = LOWER(?)";
        int rows = jdbcTemplate.update(updateSql,
                user.getName(),
                user.getEmail(),
                normalizeOptionalString(user.getPhoneNumber()),
                user.getPassword(),
                user.getStringRole(),
                emailFromToken);
        logger.info("Updated {} rows", rows);
    }

    private String normalizeOptionalString(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public User getUserById(int id) {
        String sql = "SELECT * FROM \"User\" WHERE \"ID\" = ?";
        try {
            return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> new User(
                    rs.getInt("ID"),
                    rs.getString("name"),
                    rs.getString("email"),
                    rs.getString("phoneNumber"),
                    rs.getString("password"),
                    UserRole.fromString(rs.getString("role"))), id);
        } catch (EmptyResultDataAccessException e) {
            logger.error("User not found with id: {}", id);
            return null;
        }
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

    public void deleteUserByEmail(String email) {
        String sql = "DELETE FROM \"User\" WHERE LOWER(\"email\") = LOWER(?)";
        jdbcTemplate.update(sql, email.trim().toLowerCase());
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

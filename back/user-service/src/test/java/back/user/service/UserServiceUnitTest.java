package back.user.service;

import back.user.util.JwtTokenUtil;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserServiceUnitTest {

    private final JwtTokenUtil jwtTokenUtil = mock(JwtTokenUtil.class);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final UserService userService = new UserService(jwtTokenUtil, jdbcTemplate);

    @Test
    void extractEmailShouldReturnEmailForValidToken() {
        when(jwtTokenUtil.validateJwtToken("valid-token")).thenReturn(true);
        when(jwtTokenUtil.getEmailFromJwtToken("valid-token")).thenReturn("user@example.com");

        String email = userService.extractEmail("valid-token");

        assertThat(email).isEqualTo("user@example.com");
    }

    @Test
    void extractEmailShouldReturnNullForInvalidToken() {
        when(jwtTokenUtil.validateJwtToken("invalid-token")).thenReturn(false);

        String email = userService.extractEmail("invalid-token");

        assertThat(email).isNull();
    }
}

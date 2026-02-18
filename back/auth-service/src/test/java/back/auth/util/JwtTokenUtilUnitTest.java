package back.auth.util;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenUtilUnitTest {

    @Test
    void shouldGenerateValidateAndParseToken() {
        JwtTokenUtil jwtTokenUtil = new JwtTokenUtil();
        ReflectionTestUtils.setField(jwtTokenUtil, "jwtSecret", "test-secret");
        ReflectionTestUtils.setField(jwtTokenUtil, "jwtExpiration", 60_000L);

        String token = jwtTokenUtil.generateJwtToken("user@example.com");

        assertThat(jwtTokenUtil.validateJwtToken(token)).isTrue();
        assertThat(jwtTokenUtil.getEmailFromJwtToken(token)).isEqualTo("user@example.com");
    }
}

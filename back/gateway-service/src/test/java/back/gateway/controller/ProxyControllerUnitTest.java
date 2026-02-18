package back.gateway.controller;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class ProxyControllerUnitTest {

    @Test
    void proxyShouldReturnNotFoundForUnknownPath() throws Exception {
        RestTemplate restTemplate = mock(RestTemplate.class);
        ProxyController controller = new ProxyController(
                restTemplate,
                "http://auth-service/",
                "http://user-service/",
                "http://event-service/",
                "http://quiz-service/",
                "http://geo-service/");

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/unknown/path");

        var response = controller.proxy(request);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        verifyNoInteractions(restTemplate);
    }
}

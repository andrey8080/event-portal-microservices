package back.geo.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GeoRedirectController.class)
@AutoConfigureMockMvc(addFilters = false)
class GeoRedirectControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GeocodingController geocodingController;

    @Test
    void searchEndpointShouldReturnDelegatedPayload() throws Exception {
        doReturn(ResponseEntity.ok(Map.of("results", List.of(Map.of("text", "Kazan")))))
                .when(geocodingController).searchPlaces("kazan", null, 7);

        mockMvc.perform(get("/geo/search").param("query", "kazan"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].text").value("Kazan"));
    }
}

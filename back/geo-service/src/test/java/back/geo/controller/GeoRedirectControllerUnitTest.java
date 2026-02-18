package back.geo.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;

class GeoRedirectControllerUnitTest {

    @Test
    void searchPlacesShouldDelegateToGeocodingController() {
        GeocodingController geocodingController = mock(GeocodingController.class);
        GeoRedirectController redirectController = new GeoRedirectController(geocodingController);

        ResponseEntity<?> expectedResponse = ResponseEntity.ok(Map.of("results", List.of(Map.of("text", "Kazan"))));
        doReturn(expectedResponse).when(geocodingController).searchPlaces("kazan", null, 7);

        ResponseEntity<?> actualResponse = redirectController.searchPlaces("kazan", null, 7);

        assertThat(actualResponse.getStatusCode()).isEqualTo(expectedResponse.getStatusCode());
        assertThat(actualResponse.getBody()).isEqualTo(expectedResponse.getBody());
    }
}

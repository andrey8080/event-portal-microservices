package back.geo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Контроллер для перенаправления запросов с /geo на /api/geo
 */
@RestController
@RequestMapping("/geo")
@CrossOrigin(origins = "${app.cors.allowed-origins}", allowCredentials = "true")
public class GeoRedirectController {
    private final GeocodingController geocodingController;

    @Autowired
    public GeoRedirectController(GeocodingController geocodingController) {
        this.geocodingController = geocodingController;
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchPlaces(
            @RequestParam String query,
            @RequestParam(required = false) String kind,
            @RequestParam(required = false, defaultValue = "7") Integer results) {
        return geocodingController.searchPlaces(query, kind, results);
    }

    @GetMapping("/geocode")
    public ResponseEntity<?> geocodeAddress(
            @RequestParam String address,
            @RequestParam(required = false) String kind,
            @RequestParam(required = false, defaultValue = "5") Integer results) {
        return geocodingController.geocodeAddress(address, kind, results);
    }

    @GetMapping("/search/biz")
    public ResponseEntity<?> searchBusinesses(
            @RequestParam String query,
            @RequestParam(required = false) String apikey,
            @RequestParam(required = false) String bbox,
            @RequestParam(required = false, defaultValue = "5") Integer results) {
        return geocodingController.searchBusinesses(query, apikey, bbox, results);
    }
}

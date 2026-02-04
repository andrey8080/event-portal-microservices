package back.geo.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Контроллер для проксирования запросов к геокодеру Яндекс Карт
 */
@RestController
@RequestMapping("/api/geo")
@CrossOrigin(origins = "${app.cors.allowed-origins}", allowCredentials = "true")
public class GeocodingController {
    private static final Logger logger = LoggerFactory.getLogger(GeocodingController.class);
    private final RestTemplate restTemplate;

    @Value("${yandex.maps.api.key:}")
    private String defaultApiKey;

    @Value("${yandex.maps.search.api.key:${yandex.maps.api.key:}}")
    private String searchApiKey;

    public GeocodingController() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Эндпоинт для геокодирования адреса
     */
    @GetMapping("/geocode")
    public ResponseEntity<?> geocodeAddress(
            @RequestParam String address,
            @RequestParam(required = false) String apikey) {
        logger.info("Получен запрос на геокодирование адреса: {}", address);

        String useApiKey = apikey != null && !apikey.isEmpty() ? apikey : defaultApiKey;

        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromHttpUrl("https://geocode-maps.yandex.ru/1.x/")
                    .queryParam("geocode", address)
                    .queryParam("apikey", useApiKey)
                    .queryParam("format", "json")
                    .queryParam("results", 5);

            builder.queryParam("kind", "house");
            builder.queryParam("kind", "street");
            builder.queryParam("kind", "metro");
            builder.queryParam("kind", "district");
            builder.queryParam("kind", "locality");

            String url = builder.build().toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> yandexResponse = response.getBody();
            Map<String, Object> result = processYandexGeocoderResponse(yandexResponse, address);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Ошибка при геокодировании адреса: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при геокодировании адреса");
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Эндпоинт для поиска мест по запросу - универсальный поиск.
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchPlaces(
            @RequestParam String query,
            @RequestParam(required = false) String apikey) {
        logger.info("Получен запрос на поиск места: {}", query);

        String useApiKey = apikey != null && !apikey.isEmpty() ? apikey : defaultApiKey;

        try {
            List<Map<String, Object>> allResults = new ArrayList<>();

            try {
                Map<String, Object> geocodeResults = searchAddresses(query, useApiKey);
                List<Map<String, Object>> geoItems = (List<Map<String, Object>>) geocodeResults.getOrDefault(
                        "results",
                        new ArrayList<>());

                if (!geoItems.isEmpty()) {
                    allResults.addAll(geoItems);
                }
            } catch (Exception e) {
                logger.warn("Ошибка при поиске через геокодер: {}", e.getMessage());
            }

            boolean isPossiblyOrganization = !query.matches(".*\\d+.*")
                    && !query.toLowerCase().contains("улица")
                    && !query.toLowerCase().contains("проспект")
                    && !query.toLowerCase().contains("шоссе");

            if (isPossiblyOrganization) {
                try {
                    Map<String, Object> bizResults = searchBusinessesInternal(query, this.searchApiKey);
                    List<Map<String, Object>> bizItems = (List<Map<String, Object>>) bizResults.getOrDefault(
                            "results",
                            new ArrayList<>());
                    if (!bizItems.isEmpty()) {
                        allResults.addAll(bizItems);
                    }
                } catch (Exception e) {
                    logger.warn("Ошибка при поиске через бизнес-API: {}", e.getMessage());
                }
            }

            if (allResults.isEmpty() && query.contains(" ")) {
                String[] parts = query.split("\\s+");
                if (parts.length > 0) {
                    try {
                        Map<String, Object> partBizResults = searchBusinessesInternal(parts[0], this.searchApiKey);
                        List<Map<String, Object>> partBizItems = (List<Map<String, Object>>) partBizResults
                                .getOrDefault(
                                        "results",
                                        new ArrayList<>());
                        if (!partBizItems.isEmpty()) {
                            allResults.addAll(partBizItems);
                        }
                    } catch (Exception e) {
                        logger.warn("Ошибка при поиске по части запроса: {}", e.getMessage());
                    }
                }
            }

            if (!allResults.isEmpty()) {
                allResults = removeDuplicateResults(allResults);
            }

            Map<String, Object> finalResult = new HashMap<>();
            finalResult.put("results", allResults);
            return ResponseEntity.ok(finalResult);
        } catch (Exception e) {
            logger.error("Ошибка при поиске места: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при поиске места");
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    private Map<String, Object> searchAddresses(String query, String apikey) throws Exception {
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl("https://geocode-maps.yandex.ru/1.x/")
                .queryParam("geocode", encodedQuery)
                .queryParam("apikey", apikey)
                .queryParam("format", "json")
                .queryParam("results", 10)
                .queryParam("kind", "house")
                .queryParam("kind", "metro")
                .queryParam("kind", "district")
                .queryParam("kind", "locality")
                .queryParam("kind", "street")
                .queryParam("rspn", "1")
                .queryParam("ll", "30.315644,59.939095")
                .queryParam("spn", "0.552069,0.400552");

        String url = builder.build().toUriString();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        Map<String, Object> yandexResponse = response.getBody();
        return processYandexGeocoderResponse(yandexResponse, query);
    }

    /**
     * Эндпоинт для поиска организаций и достопримечательностей по запросу.
     */
    @GetMapping("/search/biz")
    public ResponseEntity<?> searchBusinesses(
            @RequestParam String query,
            @RequestParam(required = false) String apikey,
            @RequestParam(required = false) String bbox,
            @RequestParam(required = false, defaultValue = "5") Integer results) {
        logger.info("Получен запрос на поиск организации: {}", query);

        String useApiKey = apikey != null && !apikey.isEmpty() ? apikey : this.searchApiKey;

        try {
            Map<String, Object> result = searchBusinessesInternal(query, useApiKey, bbox, results);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Ошибка при поиске организации: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при поиске организации");
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    private Map<String, Object> searchBusinessesInternal(String query, String apikey, String bbox, Integer results)
            throws Exception {
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl("https://search-maps.yandex.ru/v1/")
                .queryParam("text", encodedQuery)
                .queryParam("apikey", apikey)
                .queryParam("lang", "ru_RU")
                .queryParam("type", "biz")
                .queryParam("results", results);

        if (bbox != null && !bbox.isEmpty()) {
            builder.queryParam("bbox", bbox);
        } else {
            builder.queryParam("ll", "30.315644,59.939095");
            builder.queryParam("spn", "0.552069,0.400552");
            builder.queryParam("rspn", "1");
        }

        String url = builder.build().toUriString();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        Map<String, Object> yandexResponse = response.getBody();
        return processYandexBusinessSearchResponse(yandexResponse, query);
    }

    private Map<String, Object> searchBusinessesInternal(String query, String apikey) throws Exception {
        return searchBusinessesInternal(query, apikey, null, 5);
    }

    private List<Map<String, Object>> removeDuplicateResults(List<Map<String, Object>> results) {
        Map<String, Map<String, Object>> uniqueResults = new HashMap<>();

        for (Map<String, Object> result : results) {
            if (result.containsKey("lat") && result.containsKey("lng")) {
                Double lat = (Double) result.get("lat");
                Double lng = (Double) result.get("lng");
                String key = String.format("%.5f:%.5f", lat, lng);

                Map<String, Object> existing = uniqueResults.get(key);
                if (existing == null
                        || ((String) result.getOrDefault("name", ""))
                                .length() > ((String) existing.getOrDefault("name", "")).length()
                        || ((String) result.getOrDefault("address", ""))
                                .length() > ((String) existing.getOrDefault("address", "")).length()) {
                    uniqueResults.put(key, result);
                }
            }
        }

        return new ArrayList<>(uniqueResults.values());
    }

    private Map<String, Object> processYandexBusinessSearchResponse(Map<String, Object> yandexResponse,
            String defaultName) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> results = new ArrayList<>();

        try {
            if (yandexResponse != null && yandexResponse.containsKey("features")) {
                List<Map<String, Object>> features = (List<Map<String, Object>>) yandexResponse.get("features");

                for (Map<String, Object> feature : features) {
                    try {
                        Map<String, Object> resultItem = new HashMap<>();

                        if (feature.containsKey("geometry")
                                && ((Map<String, Object>) feature.get("geometry")).containsKey("coordinates")) {
                            List<Double> coordinates = (List<Double>) ((Map<String, Object>) feature.get("geometry"))
                                    .get("coordinates");
                            resultItem.put("lng", coordinates.get(0));
                            resultItem.put("lat", coordinates.get(1));
                        }

                        if (feature.containsKey("properties")) {
                            Map<String, Object> properties = (Map<String, Object>) feature.get("properties");

                            if (properties.containsKey("name")) {
                                resultItem.put("name", properties.get("name"));
                            } else {
                                resultItem.put("name", defaultName);
                            }

                            if (properties.containsKey("CompanyMetaData")
                                    && ((Map<String, Object>) properties.get("CompanyMetaData"))
                                            .containsKey("address")) {
                                resultItem.put("address",
                                        ((Map<String, Object>) properties.get("CompanyMetaData")).get("address"));
                            } else {
                                resultItem.put("address", resultItem.get("name"));
                            }

                            if (properties.containsKey("CompanyMetaData")
                                    && ((Map<String, Object>) properties.get("CompanyMetaData"))
                                            .containsKey("Categories")) {
                                List<Map<String, Object>> categories = (List<Map<String, Object>>) ((Map<String, Object>) properties
                                        .get("CompanyMetaData")).get("Categories");
                                if (!categories.isEmpty() && categories.get(0).containsKey("name")) {
                                    resultItem.put("type", categories.get(0).get("name"));
                                }
                            }
                        }

                        results.add(resultItem);
                    } catch (Exception e) {
                        logger.warn("Ошибка обработки элемента результата поиска организации: {}", e.getMessage());
                    }
                }
            }

            result.put("results", results);
        } catch (Exception e) {
            logger.error("Ошибка обработки ответа поиска организаций: {}", e.getMessage(), e);
            result.put("results", Collections.emptyList());
            result.put("error", "Ошибка обработки ответа поиска");
        }

        return result;
    }

    private Map<String, Object> processYandexGeocoderResponse(Map<String, Object> yandexResponse, String defaultName) {
        Map<String, Object> result = new HashMap<>();

        try {
            if (yandexResponse != null && yandexResponse.containsKey("response")) {
                Map<String, Object> response = (Map<String, Object>) yandexResponse.get("response");
                Map<String, Object> geoObjectCollection = (Map<String, Object>) response.get("GeoObjectCollection");

                if (geoObjectCollection != null && geoObjectCollection.containsKey("featureMember")) {
                    result.put("results", parseYandexGeoObjects(
                            (List<Map<String, Object>>) geoObjectCollection.get("featureMember"),
                            defaultName));
                } else {
                    result.put("results", Collections.emptyList());
                }
            } else {
                result.put("results", Collections.emptyList());
            }
        } catch (Exception e) {
            logger.error("Ошибка при обработке ответа Яндекс Геокодера: {}", e.getMessage(), e);
            result.put("results", Collections.emptyList());
            result.put("error", "Ошибка при обработке ответа геокодера");
        }

        return result;
    }

    private List<Map<String, Object>> parseYandexGeoObjects(List<Map<String, Object>> features, String defaultName) {
        List<Map<String, Object>> results = new ArrayList<>();

        for (Map<String, Object> feature : features) {
            try {
                Map<String, Object> geoObject = (Map<String, Object>) feature.get("GeoObject");
                if (geoObject != null) {
                    Map<String, Object> resultItem = new HashMap<>();

                    String name = (String) geoObject.getOrDefault("name", defaultName);
                    resultItem.put("name", name);

                    String text = null;
                    String kind = null;
                    String precision = null;
                    if (geoObject.containsKey("metaDataProperty")) {
                        Map<String, Object> metaDataProperty = (Map<String, Object>) geoObject.get("metaDataProperty");
                        if (metaDataProperty != null && metaDataProperty.containsKey("GeocoderMetaData")) {
                            Map<String, Object> geocoderMetaData = (Map<String, Object>) metaDataProperty
                                    .get("GeocoderMetaData");
                            if (geocoderMetaData != null) {
                                text = (String) geocoderMetaData.getOrDefault("text", null);
                                kind = (String) geocoderMetaData.getOrDefault("kind", null);
                                precision = (String) geocoderMetaData.getOrDefault("precision", null);

                                if (geocoderMetaData.containsKey("Address") && "house".equals(kind)) {
                                    Map<String, Object> address = (Map<String, Object>) geocoderMetaData.get("Address");
                                    if (address.containsKey("Components")) {
                                        List<Map<String, Object>> components = (List<Map<String, Object>>) address
                                                .get("Components");
                                        for (Map<String, Object> component : components) {
                                            if ("house".equals(component.get("kind"))) {
                                                String houseNumber = (String) component.get("name");
                                                if (houseNumber != null && !name.contains(houseNumber)) {
                                                    name = name + ", " + houseNumber;
                                                    resultItem.put("name", name);
                                                }
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    resultItem.put("address", text != null ? text : resultItem.get("name"));

                    if (kind != null) {
                        resultItem.put("type", mapGeocoderKindToType(kind));
                    }

                    if (precision != null) {
                        resultItem.put("precision", precision);
                    }

                    if (geoObject.containsKey("Point")) {
                        Map<String, Object> point = (Map<String, Object>) geoObject.get("Point");
                        if (point != null && point.containsKey("pos")) {
                            String pos = (String) point.get("pos");
                            String[] coordinates = pos.split(" ");
                            if (coordinates.length >= 2) {
                                resultItem.put("lng", Double.parseDouble(coordinates[0]));
                                resultItem.put("lat", Double.parseDouble(coordinates[1]));
                            }
                        }
                    }

                    results.add(resultItem);
                }
            } catch (Exception e) {
                logger.warn("Ошибка при обработке объекта геокодирования: {}", e.getMessage());
            }
        }

        return results;
    }

    private String mapGeocoderKindToType(String kind) {
        switch (kind) {
            case "house":
                return "Здание";
            case "street":
                return "Улица";
            case "metro":
                return "Станция метро";
            case "district":
                return "Район";
            case "locality":
                return "Населённый пункт";
            case "province":
                return "Регион";
            case "country":
                return "Страна";
            default:
                return "Место";
        }
    }
}

package back.geo.controller;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

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
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/address")
@CrossOrigin(origins = "${app.cors.allowed-origins}", allowCredentials = "true")
@SuppressWarnings({ "rawtypes", "unchecked", "null" })
public class AddressController {
    private static final Logger logger = LoggerFactory.getLogger(AddressController.class);

    // TTL >= 1h per requirement.
    private static final int CACHE_MAX_ENTRIES = 2000;
    private static final long CACHE_TTL_MS = 60L * 60L * 1000L;

    private static final class CacheEntry {
        final long expiresAt;
        final Map<String, Object> payload;

        CacheEntry(long expiresAt, Map<String, Object> payload) {
            this.expiresAt = expiresAt;
            this.payload = payload;
        }
    }

    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    private final RestTemplate restTemplate;
    private final GeocodingController geocodingController;

    @Value("${yandex.maps.api.key:}")
    private String defaultApiKey;

    @Value("${yandex.maps.search.api.key:${yandex.maps.api.key:}}")
    private String searchApiKey;

    public AddressController(RestTemplate restTemplate, GeocodingController geocodingController) {
        this.restTemplate = restTemplate;
        this.geocodingController = geocodingController;
    }

    @GetMapping("/suggest")
    public ResponseEntity<?> suggest(@RequestParam(name = "q") String q,
            @RequestParam(required = false, defaultValue = "5") Integer results) {
        String query = q == null ? "" : q.trim();
        if (query.length() < 3) {
            Map<String, Object> ok = new HashMap<>();
            ok.put("results", List.of());
            return ResponseEntity.ok(ok);
        }

        if (defaultApiKey == null || defaultApiKey.isBlank()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Yandex Maps API key is not configured on server");
            return ResponseEntity.status(500).body(error);
        }

        int limit = Math.min(results == null ? 5 : results.intValue(), 5);
        String normalized = query.toLowerCase(Locale.ROOT);
        String cacheKey = "suggest|" + limit + "|" + normalized;
        Map<String, Object> cached = cacheGet(cacheKey);
        if (cached != null) {
            return ResponseEntity.ok(cached);
        }

        try {
            String apiKey = (searchApiKey != null && !searchApiKey.isBlank()) ? searchApiKey : defaultApiKey;

            URI uri = UriComponentsBuilder
                    .fromHttpUrl("https://suggest-maps.yandex.ru/v1/suggest")
                    .queryParam("apikey", apiKey)
                    .queryParam("text", query)
                    .queryParam("lang", "ru_RU")
                    .queryParam("results", limit)
                    .build()
                    .encode()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);
            Map<String, Object> payload = mapSuggestResponse(response.getBody());

            cachePut(cacheKey, payload);
            return ResponseEntity.ok(payload);
        } catch (HttpStatusCodeException e) {
            // Часто 403 означает, что текущий API key не имеет доступа к suggest-maps.
            // Делаем fallback на геокодер (хуже по best-practice, но сохраняет UX).
            logger.warn("Suggest API returned {}. Falling back to Geocoder.", e.getStatusCode());
            Map<String, Object> fallback = fallbackSuggestViaGeocoder(query, limit);
            cachePut(cacheKey, fallback);
            return ResponseEntity.ok(fallback);
        } catch (ResourceAccessException e) {
            logger.warn("Suggest timeout/error: {}", e.getMessage());
            Map<String, Object> fallback = fallbackSuggestViaGeocoder(query, limit);
            cachePut(cacheKey, fallback);
            return ResponseEntity.ok(fallback);
        } catch (Exception e) {
            logger.error("Ошибка suggest: {}", e.getMessage(), e);
            Map<String, Object> fallback = fallbackSuggestViaGeocoder(query, limit);
            cachePut(cacheKey, fallback);
            return ResponseEntity.ok(fallback);
        }
    }

    private Map<String, Object> fallbackSuggestViaGeocoder(String query, int limit) {
        Map<String, Object> out = new HashMap<>();
        List<Map<String, Object>> results = new ArrayList<>();

        try {
            boolean hasDigits = query.matches(".*\\d+.*");

            // 1) Если в запросе есть номер дома — сначала пробуем без kind (иногда вернёт
            // house).
            if (hasDigits) {
                results.addAll(geocoderSuggest(query, limit, null));
            }

            // 2) Всегда резервный быстрый режим: kind=street.
            if (results.isEmpty()) {
                results.addAll(geocoderSuggest(query, limit, "street"));
            }
        } catch (Exception e) {
            logger.warn("Geocoder fallback failed: {}", e.getMessage());
        }

        out.put("results", results);
        return out;
    }

    private List<Map<String, Object>> geocoderSuggest(String query, int limit, String kindOrNull) {
        List<Map<String, Object>> results = new ArrayList<>();

        URI uri = UriComponentsBuilder
                .fromHttpUrl("https://geocode-maps.yandex.ru/1.x/")
                .queryParam("geocode", query)
                .queryParam("apikey", defaultApiKey)
                .queryParam("format", "json")
                .queryParam("results", limit)
                .queryParamIfPresent("kind", Optional.ofNullable(kindOrNull))
                .build()
                .encode()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/json");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);
        Map<String, Object> mapped = geocodingController.mapGeocoderResponse(response.getBody(), query);
        Object itemsObj = mapped.get("results");
        if (!(itemsObj instanceof List)) {
            return results;
        }

        for (Object obj : (List) itemsObj) {
            if (!(obj instanceof Map))
                continue;
            Map item = (Map) obj;
            String text = item.get("address") != null ? String.valueOf(item.get("address"))
                    : (item.get("name") != null ? String.valueOf(item.get("name")) : null);
            if (text == null || text.isBlank())
                continue;

            Map<String, Object> s = new HashMap<>();
            // В fallback режиме id=text: geocoder умеет геокодить строку.
            s.put("id", text);
            s.put("text", text);
            results.add(s);
        }

        return results;
    }

    @GetMapping("/geocode")
    public ResponseEntity<?> geocodeById(@RequestParam(name = "id") String id) {
        String geocode = id == null ? "" : id.trim();
        if (geocode.isBlank()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Empty id");
            return ResponseEntity.badRequest().body(error);
        }

        if (defaultApiKey == null || defaultApiKey.isBlank()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Yandex Maps API key is not configured on server");
            return ResponseEntity.status(500).body(error);
        }

        String normalized = geocode.toLowerCase(Locale.ROOT);
        String cacheKey = "geocode|" + normalized;
        Map<String, Object> cached = cacheGet(cacheKey);
        if (cached != null) {
            return ResponseEntity.ok(cached);
        }

        try {
            URI uri = UriComponentsBuilder
                    .fromHttpUrl("https://geocode-maps.yandex.ru/1.x/")
                    .queryParam("geocode", geocode)
                    .queryParam("apikey", defaultApiKey)
                    .queryParam("format", "json")
                    .queryParam("results", 1)
                    .build()
                    .encode()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);
            Map<String, Object> result = geocodingController.mapGeocoderResponse(response.getBody(), geocode);

            cachePut(cacheKey, result);
            return ResponseEntity.ok(result);
        } catch (ResourceAccessException e) {
            logger.warn("Geocode timeout/error: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Upstream timeout");
            error.put("message", "Geocode request timed out");
            return ResponseEntity.status(504).body(error);
        } catch (Exception e) {
            logger.error("Ошибка geocodeById: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка geocode");
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    private Map<String, Object> mapSuggestResponse(Map<String, Object> yandexResponse) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> out = new ArrayList<>();

        try {
            if (yandexResponse == null) {
                result.put("results", out);
                return result;
            }

            Object resultsObj = yandexResponse.get("results");
            if (!(resultsObj instanceof List)) {
                result.put("results", out);
                return result;
            }

            for (Object itemObj : (List) resultsObj) {
                if (!(itemObj instanceof Map))
                    continue;
                Map item = (Map) itemObj;

                String title = extractText(item.get("title"));
                String subtitle = extractText(item.get("subtitle"));
                String text = title;
                if (subtitle != null && !subtitle.isBlank()) {
                    text = (text == null || text.isBlank()) ? subtitle : (text + ", " + subtitle);
                }

                Object uriObj = item.get("uri");
                String uri = uriObj != null ? String.valueOf(uriObj) : null;
                String id = (uri != null && !uri.isBlank()) ? uri : text;

                if (text == null || text.isBlank())
                    continue;

                Map<String, Object> mapped = new HashMap<>();
                mapped.put("id", id);
                mapped.put("text", text);
                out.add(mapped);
            }
        } catch (Exception e) {
            logger.warn("Ошибка парсинга suggest ответа: {}", e.getMessage());
        }

        result.put("results", out);
        return result;
    }

    private String extractText(Object obj) {
        if (obj == null)
            return null;
        if (obj instanceof String)
            return (String) obj;
        if (obj instanceof Map) {
            Object text = ((Map) obj).get("text");
            if (text != null)
                return String.valueOf(text);
        }
        return String.valueOf(obj);
    }

    private Map<String, Object> cacheGet(String key) {
        CacheEntry entry = cache.get(key);
        if (entry == null)
            return null;
        if (System.currentTimeMillis() > entry.expiresAt) {
            cache.remove(key);
            return null;
        }
        return entry.payload;
    }

    private void cachePut(String key, Map<String, Object> payload) {
        if (payload == null)
            return;
        if (cache.size() > CACHE_MAX_ENTRIES) {
            cache.clear();
        }
        cache.put(key, new CacheEntry(System.currentTimeMillis() + CACHE_TTL_MS, payload));
    }
}

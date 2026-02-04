package back.gateway.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

@RestController
public class ProxyController {
    private static final List<String> HOP_BY_HOP_HEADERS = List.of(
            "connection",
            "keep-alive",
            "proxy-authenticate",
            "proxy-authorization",
            "te",
            "trailer",
            "transfer-encoding",
            "upgrade",
            "host",
            "content-length");

    /**
     * We handle CORS at the gateway level (see {@code CorsConfig}).
     * When proxying, we must not forward downstream Access-Control-* headers,
     * otherwise the browser can see multiple values (e.g. "http://localhost:4200,
     * *")
     * and block the response with status 0 / CORS error.
     */
    private static final String ACCESS_CONTROL_PREFIX = "access-control-";

    private final RestTemplate restTemplate;

    private final String authBaseUrl;
    private final String userBaseUrl;
    private final String eventBaseUrl;
    private final String quizBaseUrl;
    private final String geoBaseUrl;

    public ProxyController(
            RestTemplate restTemplate,
            @Value("${services.auth.base-url}") String authBaseUrl,
            @Value("${services.user.base-url}") String userBaseUrl,
            @Value("${services.event.base-url}") String eventBaseUrl,
            @Value("${services.quiz.base-url}") String quizBaseUrl,
            @Value("${services.geo.base-url}") String geoBaseUrl) {
        this.restTemplate = restTemplate;
        this.authBaseUrl = stripTrailingSlash(authBaseUrl);
        this.userBaseUrl = stripTrailingSlash(userBaseUrl);
        this.eventBaseUrl = stripTrailingSlash(eventBaseUrl);
        this.quizBaseUrl = stripTrailingSlash(quizBaseUrl);
        this.geoBaseUrl = stripTrailingSlash(geoBaseUrl);
    }

    @RequestMapping({
            "/auth/**",
            "/users/**",
            "/events/**",
            "/quizzes/**",
            "/api/geo/**",
            "/geo/**"
    })
    public ResponseEntity<byte[]> proxy(HttpServletRequest request) throws IOException {
        String requestPath = request.getRequestURI();
        String baseUrl = resolveBaseUrl(requestPath);
        if (baseUrl == null) {
            return ResponseEntity.notFound().build();
        }

        String queryString = request.getQueryString();
        String targetUrl = baseUrl + requestPath
                + (queryString == null || queryString.isBlank() ? "" : "?" + queryString);

        HttpMethod method;
        try {
            method = HttpMethod.valueOf(request.getMethod());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(405).build();
        }

        HttpHeaders headers = copyRequestHeaders(request);
        byte[] body = readBody(request);

        HttpEntity<byte[]> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(targetUrl, method, entity, byte[].class);
            HttpHeaders responseHeaders = filterHopByHopHeaders(response.getHeaders());
            return ResponseEntity.status(response.getStatusCode()).headers(responseHeaders).body(response.getBody());
        } catch (HttpStatusCodeException ex) {
            HttpHeaders responseHeaders = ex.getResponseHeaders() != null ? ex.getResponseHeaders() : new HttpHeaders();
            HttpHeaders filteredHeaders = filterHopByHopHeaders(responseHeaders);
            return ResponseEntity.status(ex.getStatusCode()).headers(filteredHeaders)
                    .body(ex.getResponseBodyAsByteArray());
        }
    }

    private String resolveBaseUrl(String path) {
        if (path.startsWith("/auth"))
            return authBaseUrl;
        if (path.startsWith("/users") || path.startsWith("/internal/users"))
            return userBaseUrl;
        if (path.startsWith("/events"))
            return eventBaseUrl;
        if (path.startsWith("/quizzes"))
            return quizBaseUrl;
        if (path.startsWith("/api/geo") || path.startsWith("/geo"))
            return geoBaseUrl;
        return null;
    }

    private static HttpHeaders copyRequestHeaders(HttpServletRequest request) {
        HttpHeaders headers = new HttpHeaders();

        Enumeration<String> headerNames = request.getHeaderNames();
        if (headerNames == null) {
            return headers;
        }

        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            String lower = headerName.toLowerCase(Locale.ROOT);
            if (HOP_BY_HOP_HEADERS.contains(lower)) {
                continue;
            }

            Enumeration<String> values = request.getHeaders(headerName);
            if (values == null) {
                continue;
            }

            while (values.hasMoreElements()) {
                headers.add(headerName, values.nextElement());
            }
        }

        return headers;
    }

    private static HttpHeaders filterHopByHopHeaders(HttpHeaders original) {
        HttpHeaders filtered = new HttpHeaders();
        for (String name : original.keySet()) {
            String lower = name.toLowerCase(Locale.ROOT);
            if (HOP_BY_HOP_HEADERS.contains(lower)) {
                continue;
            }
            if (lower.startsWith(ACCESS_CONTROL_PREFIX)) {
                continue;
            }
            List<String> values = original.get(name);
            if (values == null) {
                continue;
            }
            filtered.put(name, new ArrayList<>(values));
        }
        return filtered;
    }

    private static byte[] readBody(HttpServletRequest request) throws IOException {
        if (request.getContentLength() == 0) {
            return new byte[0];
        }
        return StreamUtils.copyToByteArray(request.getInputStream());
    }

    private static String stripTrailingSlash(String url) {
        if (url == null)
            return null;
        if (url.endsWith("/"))
            return url.substring(0, url.length() - 1);
        return url;
    }
}

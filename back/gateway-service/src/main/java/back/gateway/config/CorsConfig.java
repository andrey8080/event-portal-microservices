package back.gateway.config;

import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOriginPatterns;

    public CorsConfig(
            @Value("${app.cors.allowed-origins:}") String allowedOrigins) {
        Set<String> patterns = new LinkedHashSet<>();

        // Всегда разрешаем стандартный Angular dev server.
        patterns.add("http://localhost:4200");
        patterns.add("http://127.0.0.1:4200");

        if (allowedOrigins != null && !allowedOrigins.isBlank()) {
            for (String raw : allowedOrigins.split(",")) {
                String trimmed = raw == null ? "" : raw.trim();
                if (!trimmed.isBlank()) {
                    patterns.add(trimmed);
                }
            }
        }

        this.allowedOriginPatterns = patterns.toArray(new String[0]);
    }

    @Override
    @SuppressWarnings("null")
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(this.allowedOriginPatterns)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization", "Location")
                .allowCredentials(true)
                .maxAge(3600);
    }
}

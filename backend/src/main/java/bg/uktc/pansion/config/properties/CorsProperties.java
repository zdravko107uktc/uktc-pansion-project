package bg.uktc.pansion.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Arrays;
import java.util.List;

/**
 * Cross-origin configuration. {@code allowedOrigins} accepts a comma-separated list and
 * supports the {@code *} wildcard to allow any origin.
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(String allowedOrigins) {

    public List<String> originList() {
        String raw = (allowedOrigins == null || allowedOrigins.isBlank())
                ? "http://localhost:8080,http://localhost:3000,http://127.0.0.1:8080,http://127.0.0.1:3000"
                : allowedOrigins;
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }

    public boolean allowAll() {
        return originList().contains("*");
    }
}

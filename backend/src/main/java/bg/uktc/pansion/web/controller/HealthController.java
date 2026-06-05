package bg.uktc.pansion.web.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Liveness endpoints used by Railway/Docker health checks. */
@RestController
public class HealthController {

    @GetMapping({"/health", "/api/v1/health"})
    public Map<String, String> health() {
        return Map.of("status", "ok", "service", "uktc-pansion-backend");
    }
}

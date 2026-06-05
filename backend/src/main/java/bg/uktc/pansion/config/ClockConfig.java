package bg.uktc.pansion.config;

import bg.uktc.pansion.config.properties.AppProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * Exposes a {@link Clock} bound to the configured application timezone so that time is
 * injectable and therefore testable (no static {@code now()} calls scattered across services).
 */
@Configuration
public class ClockConfig {

    @Bean
    public ZoneId applicationZone(AppProperties appProperties) {
        return ZoneId.of(appProperties.timezone());
    }

    @Bean
    public Clock clock(ZoneId applicationZone) {
        return Clock.system(applicationZone);
    }
}

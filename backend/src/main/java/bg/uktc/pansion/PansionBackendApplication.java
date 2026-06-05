package bg.uktc.pansion;

import bg.uktc.pansion.config.properties.AppProperties;
import bg.uktc.pansion.config.properties.CorsProperties;
import bg.uktc.pansion.config.properties.JwtProperties;
import bg.uktc.pansion.config.properties.MailDefaultProperties;
import bg.uktc.pansion.config.properties.SecurityPolicyProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Entry point for the UKTC Pansion dormitory enrollment management backend.
 *
 * <p>The application is organised in clean layers (web -> service -> repository -> domain)
 * with cross-cutting concerns (security, notifications) decoupled via Spring events and
 * the strategy pattern. See {@code README} for the architecture overview.</p>
 */
@SpringBootApplication
@EnableAsync
@EnableJpaAuditing
@EnableConfigurationProperties({
        AppProperties.class,
        JwtProperties.class,
        CorsProperties.class,
        MailDefaultProperties.class,
        SecurityPolicyProperties.class
})
public class PansionBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(PansionBackendApplication.class, args);
    }
}

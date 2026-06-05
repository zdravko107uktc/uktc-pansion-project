package bg.uktc.pansion.service.support;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Time helper bound to the application timezone. Injecting this (instead of calling static now())
 * keeps services deterministic and testable.
 */
@Component
public class DateTimeService {

    private static final DateTimeFormatter BG_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final Clock clock;
    private final ZoneId zone;

    public DateTimeService(Clock clock, ZoneId applicationZone) {
        this.clock = clock;
        this.zone = applicationZone;
    }

    public Instant now() {
        return clock.instant();
    }

    /** Human-readable Bulgarian timestamp used in notification emails. */
    public String formatBg(Instant instant) {
        Instant value = instant == null ? now() : instant;
        return BG_FORMAT.format(value.atZone(zone));
    }

    public String formatBgNow() {
        return formatBg(now());
    }
}

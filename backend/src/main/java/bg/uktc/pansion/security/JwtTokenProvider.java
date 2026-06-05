package bg.uktc.pansion.security;

import bg.uktc.pansion.config.properties.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * Issues and validates signed JWT access tokens. Encapsulates all jjwt usage so the rest of the
 * codebase depends only on this abstraction (Dependency Inversion).
 */
@Component
public class JwtTokenProvider {

    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_TYPE = "typ";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    private final JwtProperties properties;
    private final Clock clock;
    private final SecretKey key;

    public JwtTokenProvider(JwtProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(Long userId, String role) {
        return buildToken(userId, role, TYPE_ACCESS, properties.accessTokenSeconds());
    }

    public String generateRefreshToken(Long userId, String role) {
        return buildToken(userId, role, TYPE_REFRESH, properties.refreshTokenSeconds());
    }

    private String buildToken(Long userId, String role, String type, long ttlSeconds) {
        Instant now = clock.instant();
        return Jwts.builder()
                .issuer(properties.issuer())
                .subject(String.valueOf(userId))
                .claim(CLAIM_ROLE, role)
                .claim(CLAIM_TYPE, type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(key)
                .compact();
    }

    /** @return the user id from a valid access token, or empty if the token is invalid/expired. */
    public Optional<Long> resolveUserId(String token) {
        return parse(token)
                .filter(claims -> !TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class)))
                .map(Claims::getSubject)
                .map(Long::valueOf);
    }

    public Optional<Long> resolveRefreshUserId(String token) {
        return parse(token)
                .filter(claims -> TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class)))
                .map(Claims::getSubject)
                .map(Long::valueOf);
    }

    private Optional<Claims> parse(String token) {
        try {
            return Optional.of(Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload());
        } catch (JwtException | IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}

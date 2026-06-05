package com.hotelexchange.security;

import com.hotelexchange.config.AppProperties;
import com.hotelexchange.user.UserEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final String USER_ID_CLAIM = "uid";
    private static final String DISPLAY_NAME_CLAIM = "displayName";

    private final AppProperties properties;
    private SecretKey signingKey;

    public JwtService(AppProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void init() {
        byte[] secret = properties.getSecurity().getJwtSecret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes");
        }
        signingKey = Keys.hmacShaKeyFor(secret);
    }

    public JwtToken issueToken(UserEntity user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(properties.getSecurity().getJwtExpirationMinutes(), ChronoUnit.MINUTES);

        String token = Jwts.builder()
                .subject(user.getUsername())
                .claim(USER_ID_CLAIM, user.getId())
                .claim(DISPLAY_NAME_CLAIM, user.getDisplayName())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey)
                .compact();

        return new JwtToken(token, expiresAt);
    }

    public AuthenticatedUser readUser(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Long userId = claims.get(USER_ID_CLAIM, Number.class).longValue();
        String username = claims.getSubject();
        String displayName = claims.get(DISPLAY_NAME_CLAIM, String.class);
        return new AuthenticatedUser(userId, username, displayName);
    }
}

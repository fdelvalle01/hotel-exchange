package com.hotelexchange.auth;

import com.hotelexchange.config.AppProperties;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class LoginRateLimiter {

    private final Map<String, AttemptWindow> attempts = new ConcurrentHashMap<>();
    private final int maxAttempts;
    private final Duration window;

    public LoginRateLimiter(AppProperties properties) {
        this.maxAttempts = properties.getLoginRateLimit().getMaxAttempts();
        this.window = Duration.ofMinutes(properties.getLoginRateLimit().getWindowMinutes());
    }

    public boolean isBlocked(String key) {
        AttemptWindow attemptWindow = attempts.get(key);
        if (attemptWindow == null || attemptWindow.isExpired(window)) {
            attempts.remove(key);
            return false;
        }
        return attemptWindow.count() >= maxAttempts;
    }

    public void recordFailure(String key) {
        attempts.compute(key, (ignored, current) -> {
            if (current == null || current.isExpired(window)) {
                return new AttemptWindow(1, Instant.now());
            }
            return new AttemptWindow(current.count() + 1, current.firstAttemptAt());
        });
    }

    public void clear(String key) {
        attempts.remove(key);
    }

    private record AttemptWindow(int count, Instant firstAttemptAt) {
        boolean isExpired(Duration window) {
            return firstAttemptAt.plus(window).isBefore(Instant.now());
        }
    }
}

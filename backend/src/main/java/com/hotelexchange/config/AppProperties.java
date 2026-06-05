package com.hotelexchange.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Cors cors = new Cors();
    private final Security security = new Security();
    private final Websocket websocket = new Websocket();
    private final Chat chat = new Chat();
    private final LoginRateLimit loginRateLimit = new LoginRateLimit();
    private final Seed seed = new Seed();

    public Cors getCors() {
        return cors;
    }

    public Security getSecurity() {
        return security;
    }

    public Websocket getWebsocket() {
        return websocket;
    }

    public Chat getChat() {
        return chat;
    }

    public LoginRateLimit getLoginRateLimit() {
        return loginRateLimit;
    }

    public Seed getSeed() {
        return seed;
    }

    public static class Cors {
        @NotBlank
        private String allowedOrigins = "http://localhost:5173";

        public String getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(String allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }

        public List<String> asList() {
            return Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .toList();
        }
    }

    public static class Security {
        @NotBlank
        private String jwtSecret = "local-dev-jwt-secret-change-in-production-64-characters-long";

        @Min(15)
        @Max(1440)
        private long jwtExpirationMinutes = 120;

        public String getJwtSecret() {
            return jwtSecret;
        }

        public void setJwtSecret(String jwtSecret) {
            this.jwtSecret = jwtSecret;
        }

        public long getJwtExpirationMinutes() {
            return jwtExpirationMinutes;
        }

        public void setJwtExpirationMinutes(long jwtExpirationMinutes) {
            this.jwtExpirationMinutes = jwtExpirationMinutes;
        }
    }

    public static class Websocket {
        @Min(256)
        @Max(8192)
        private int maxPayloadBytes = 2048;

        public int getMaxPayloadBytes() {
            return maxPayloadBytes;
        }

        public void setMaxPayloadBytes(int maxPayloadBytes) {
            this.maxPayloadBytes = maxPayloadBytes;
        }
    }

    public static class Chat {
        @Min(1)
        @Max(500)
        private int maxLength = 240;

        public int getMaxLength() {
            return maxLength;
        }

        public void setMaxLength(int maxLength) {
            this.maxLength = maxLength;
        }
    }

    public static class LoginRateLimit {
        @Min(1)
        @Max(100)
        private int maxAttempts = 5;

        @Min(1)
        @Max(60)
        private long windowMinutes = 5;

        public int getMaxAttempts() {
            return maxAttempts;
        }

        public void setMaxAttempts(int maxAttempts) {
            this.maxAttempts = maxAttempts;
        }

        public long getWindowMinutes() {
            return windowMinutes;
        }

        public void setWindowMinutes(long windowMinutes) {
            this.windowMinutes = windowMinutes;
        }
    }

    public static class Seed {
        @NotBlank
        private String testUsername = "trader";

        @NotBlank
        private String testPassword = "trader";

        @NotBlank
        private String secondTestUsername = "broker";

        @NotBlank
        private String secondTestPassword = "broker";

        public String getTestUsername() {
            return testUsername;
        }

        public void setTestUsername(String testUsername) {
            this.testUsername = testUsername;
        }

        public String getTestPassword() {
            return testPassword;
        }

        public void setTestPassword(String testPassword) {
            this.testPassword = testPassword;
        }

        public String getSecondTestUsername() {
            return secondTestUsername;
        }

        public void setSecondTestUsername(String secondTestUsername) {
            this.secondTestUsername = secondTestUsername;
        }

        public String getSecondTestPassword() {
            return secondTestPassword;
        }

        public void setSecondTestPassword(String secondTestPassword) {
            this.secondTestPassword = secondTestPassword;
        }
    }
}

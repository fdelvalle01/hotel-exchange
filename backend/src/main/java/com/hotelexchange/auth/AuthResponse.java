package com.hotelexchange.auth;

import com.hotelexchange.user.UserResponse;
import java.time.Instant;

public record AuthResponse(
        String token,
        Instant expiresAt,
        UserResponse user
) {
}

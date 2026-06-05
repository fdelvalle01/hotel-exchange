package com.hotelexchange.security;

public record AuthenticatedUser(
        Long id,
        String username,
        String displayName
) {
}

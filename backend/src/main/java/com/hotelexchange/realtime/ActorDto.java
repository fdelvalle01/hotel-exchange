package com.hotelexchange.realtime;

import com.hotelexchange.security.AuthenticatedUser;

public record ActorDto(
        Long id,
        String username,
        String displayName
) {
    public static ActorDto from(AuthenticatedUser user) {
        return new ActorDto(user.id(), user.username(), user.displayName());
    }
}

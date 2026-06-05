package com.hotelexchange.realtime;

import java.time.Instant;

public record PresenceUserDto(
        Long userId,
        String username,
        String displayName,
        int x,
        int y,
        String direction,
        Instant joinedAt
) {
    public static PresenceUserDto from(RoomClient client) {
        return new PresenceUserDto(
                client.user().id(),
                client.user().username(),
                client.user().displayName(),
                client.position().x(),
                client.position().y(),
                client.direction(),
                client.joinedAt()
        );
    }
}

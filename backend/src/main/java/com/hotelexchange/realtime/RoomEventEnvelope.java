package com.hotelexchange.realtime;

import java.time.Instant;

public record RoomEventEnvelope(
        RoomEventType type,
        Long roomId,
        ActorDto actor,
        Object payload,
        Instant occurredAt
) {
    public static RoomEventEnvelope of(RoomEventType type, Long roomId, ActorDto actor, Object payload) {
        return new RoomEventEnvelope(type, roomId, actor, payload, Instant.now());
    }
}

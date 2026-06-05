package com.hotelexchange.realtime;

import java.time.Instant;
import org.springframework.web.socket.WebSocketSession;

public record RoomClient(
        String sessionId,
        WebSocketSession session,
        ActorDto user,
        GridPosition position,
        String direction,
        Instant joinedAt
) {
}

package com.hotelexchange.realtime;

import com.fasterxml.jackson.databind.JsonNode;

public record InboundRoomEvent(
        RoomEventType type,
        JsonNode payload
) {
}

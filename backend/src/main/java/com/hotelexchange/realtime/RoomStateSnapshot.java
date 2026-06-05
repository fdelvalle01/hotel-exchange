package com.hotelexchange.realtime;

public record RoomStateSnapshot(
        GridPosition position,
        String direction
) {
}

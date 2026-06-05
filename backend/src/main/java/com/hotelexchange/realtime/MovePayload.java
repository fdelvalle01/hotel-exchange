package com.hotelexchange.realtime;

public record MovePayload(
        int x,
        int y,
        String direction
) {
}

package com.hotelexchange.room;

public record RoomTile(
        int x,
        int y,
        boolean exists,
        boolean walkable,
        int height
) {}

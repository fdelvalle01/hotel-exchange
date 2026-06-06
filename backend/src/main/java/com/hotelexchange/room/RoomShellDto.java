package com.hotelexchange.room;

public record RoomShellDto(
        String wallMode,
        int wallHeight,
        String floorTheme,
        String wallTheme
) {}

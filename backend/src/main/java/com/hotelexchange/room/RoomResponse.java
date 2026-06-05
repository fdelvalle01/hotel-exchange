package com.hotelexchange.room;

import com.hotelexchange.realtime.GridPosition;
import java.util.List;

public record RoomResponse(
        Long id,
        String name,
        int width,
        int height,
        int spawnX,
        int spawnY,
        List<GridPosition> blockedTiles,
        int onlineCount
) {
    public static RoomResponse from(RoomEntity room, List<GridPosition> blockedTiles, int onlineCount) {
        return new RoomResponse(
                room.getId(),
                room.getName(),
                room.getWidth(),
                room.getHeight(),
                room.getSpawnX(),
                room.getSpawnY(),
                blockedTiles,
                onlineCount
        );
    }
}

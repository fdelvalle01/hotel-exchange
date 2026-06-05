package com.hotelexchange.room;

import com.hotelexchange.furniture.BlockedTileDto;
import com.hotelexchange.furniture.RoomFurnitureDto;
import java.util.List;

public record RoomDetailDto(
        Long id,
        String name,
        int width,
        int height,
        int spawnX,
        int spawnY,
        List<BlockedTileDto> blockedTiles,
        List<RoomFurnitureDto> furniture,
        int onlineCount
) {
    public static RoomDetailDto from(
            RoomEntity room,
            List<BlockedTileDto> blockedTiles,
            List<RoomFurnitureDto> furniture,
            int onlineCount
    ) {
        return new RoomDetailDto(
                room.getId(),
                room.getName(),
                room.getWidth(),
                room.getHeight(),
                room.getSpawnX(),
                room.getSpawnY(),
                blockedTiles,
                furniture,
                onlineCount
        );
    }
}

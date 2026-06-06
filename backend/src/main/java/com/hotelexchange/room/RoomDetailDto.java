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
        String spawnDirection,
        String modelCode,
        RoomShellDto shell,
        RoomModelDto model,
        List<BlockedTileDto> blockedTiles,
        List<RoomFurnitureDto> furniture,
        int onlineCount
) {
    public static RoomDetailDto from(
            RoomEntity room,
            RoomModelEntity roomModel,
            List<BlockedTileDto> blockedTiles,
            List<RoomFurnitureDto> furniture,
            int onlineCount
    ) {
        RoomShellDto shell = null;
        RoomModelDto modelDto = null;
        String spawnDirection = null;
        String modelCode = room.getModelCode();

        if (roomModel != null) {
            shell = new RoomShellDto(
                    roomModel.getWallMode(),
                    roomModel.getWallHeight(),
                    room.getFloorTheme(),
                    room.getWallTheme()
            );
            modelDto = RoomModelDto.from(roomModel);
            spawnDirection = roomModel.getSpawnDirection();
        }

        return new RoomDetailDto(
                room.getId(),
                room.getName(),
                room.getWidth(),
                room.getHeight(),
                room.getSpawnX(),
                room.getSpawnY(),
                spawnDirection,
                modelCode,
                shell,
                modelDto,
                blockedTiles,
                furniture,
                onlineCount
        );
    }
}

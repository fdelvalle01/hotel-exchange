package com.hotelexchange.room;

public record RoomModelDto(
        Long id,
        String code,
        String name,
        int width,
        int height,
        String floorMap,
        String wallMode,
        int wallHeight,
        int spawnX,
        int spawnY,
        String spawnDirection,
        String theme
) {
    public static RoomModelDto from(RoomModelEntity entity) {
        return new RoomModelDto(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getWidth(),
                entity.getHeight(),
                entity.getFloorMap(),
                entity.getWallMode(),
                entity.getWallHeight(),
                entity.getSpawnX(),
                entity.getSpawnY(),
                entity.getSpawnDirection(),
                entity.getTheme()
        );
    }
}

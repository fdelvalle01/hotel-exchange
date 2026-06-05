package com.hotelexchange.furniture;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;

public record RoomFurnitureDto(
        Long id,
        String catalogCode,
        String name,
        String spriteKey,
        String spritePath,
        int x,
        int y,
        BigDecimal z,
        String rotation,
        int width,
        int height,
        boolean blocksMovement,
        String interactionType,
        JsonNode state
) {
    public static RoomFurnitureDto from(RoomFurnitureEntity entity, JsonNode state) {
        FurnitureCatalogEntity catalogItem = entity.getCatalogItem();
        return new RoomFurnitureDto(
                entity.getId(),
                catalogItem.getCode(),
                catalogItem.getName(),
                catalogItem.getSpriteKey(),
                catalogItem.getSpritePath(),
                entity.getX(),
                entity.getY(),
                entity.getZ(),
                entity.getRotation(),
                catalogItem.getWidth(),
                catalogItem.getHeight(),
                catalogItem.isBlocksMovement(),
                catalogItem.getInteractionType(),
                state
        );
    }
}

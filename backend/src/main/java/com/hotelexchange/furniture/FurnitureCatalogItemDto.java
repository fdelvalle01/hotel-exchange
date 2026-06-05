package com.hotelexchange.furniture;

import java.math.BigDecimal;

public record FurnitureCatalogItemDto(
        Long id,
        String code,
        String name,
        String type,
        String spriteKey,
        String spritePath,
        int width,
        int height,
        boolean blocksMovement,
        boolean canSit,
        boolean canWalk,
        boolean canStack,
        BigDecimal defaultZ,
        String interactionType,
        boolean tradeable
) {
    public static FurnitureCatalogItemDto from(FurnitureCatalogEntity entity) {
        return new FurnitureCatalogItemDto(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getType(),
                entity.getSpriteKey(),
                entity.getSpritePath(),
                entity.getWidth(),
                entity.getHeight(),
                entity.isBlocksMovement(),
                entity.isCanSit(),
                entity.isCanWalk(),
                entity.isCanStack(),
                entity.getDefaultZ(),
                entity.getInteractionType(),
                entity.isTradeable()
        );
    }
}

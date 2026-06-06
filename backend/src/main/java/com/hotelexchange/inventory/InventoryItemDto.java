package com.hotelexchange.inventory;

import com.hotelexchange.furniture.FurnitureCatalogEntity;

public record InventoryItemDto(
        Long id,
        Long catalogItemId,
        String code,
        String name,
        String type,
        String spriteKey,
        String spritePath,
        int width,
        int height,
        int quantity,
        boolean canSit,
        boolean canWalk,
        boolean canStack,
        boolean blocksMovement,
        String interactionType,
        boolean tradeable
) {
    public static InventoryItemDto from(UserInventoryEntity entity) {
        FurnitureCatalogEntity catalogItem = entity.getCatalogItem();
        return new InventoryItemDto(
                entity.getId(),
                catalogItem.getId(),
                catalogItem.getCode(),
                catalogItem.getName(),
                catalogItem.getType(),
                catalogItem.getSpriteKey(),
                catalogItem.getSpritePath(),
                catalogItem.getWidth(),
                catalogItem.getHeight(),
                entity.getQuantity(),
                catalogItem.isCanSit(),
                catalogItem.isCanWalk(),
                catalogItem.isCanStack(),
                catalogItem.isBlocksMovement(),
                catalogItem.getInteractionType(),
                catalogItem.isTradeable()
        );
    }
}

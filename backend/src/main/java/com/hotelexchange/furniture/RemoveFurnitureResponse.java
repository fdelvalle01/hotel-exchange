package com.hotelexchange.furniture;

import com.hotelexchange.inventory.InventoryItemDto;

public record RemoveFurnitureResponse(
        Long removedFurnitureId,
        String catalogCode,
        InventoryItemDto updatedInventoryItem
) {
}

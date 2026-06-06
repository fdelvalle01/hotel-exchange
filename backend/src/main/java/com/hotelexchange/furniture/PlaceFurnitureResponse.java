package com.hotelexchange.furniture;

import com.hotelexchange.inventory.InventoryItemDto;

public record PlaceFurnitureResponse(
        RoomFurnitureDto placedFurniture,
        InventoryItemDto updatedInventoryItem
) {
}

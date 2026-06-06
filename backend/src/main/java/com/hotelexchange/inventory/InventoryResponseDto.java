package com.hotelexchange.inventory;

import java.util.List;

public record InventoryResponseDto(
        List<InventoryItemDto> items
) {
}

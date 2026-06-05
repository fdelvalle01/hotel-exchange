package com.hotelexchange.furniture;

import com.hotelexchange.realtime.GridPosition;

public record BlockedTileDto(
        int x,
        int y
) {
    public static BlockedTileDto from(GridPosition position) {
        return new BlockedTileDto(position.x(), position.y());
    }
}

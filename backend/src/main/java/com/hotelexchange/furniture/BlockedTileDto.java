package com.hotelexchange.furniture;

import com.hotelexchange.realtime.GridPosition;

public record BlockedTileDto(
        int x,
        int y,
        String reason
) {
    public static BlockedTileDto structural(GridPosition position) {
        return new BlockedTileDto(position.x(), position.y(), "STRUCTURAL");
    }

    public static BlockedTileDto furniture(GridPosition position) {
        return new BlockedTileDto(position.x(), position.y(), "FURNITURE");
    }

    public static BlockedTileDto from(GridPosition position) {
        return furniture(position);
    }
}

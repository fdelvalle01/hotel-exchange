package com.hotelexchange.realtime;

import java.util.List;

public record UserMovedPayload(
        int x,
        int y,
        String direction,
        List<GridPosition> path
) {
}

package com.hotelexchange.realtime;

import java.util.List;

public record MovementResult(
        GridPosition position,
        String direction,
        List<GridPosition> path
) {
}

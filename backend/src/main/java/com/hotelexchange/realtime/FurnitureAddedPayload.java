package com.hotelexchange.realtime;

import com.hotelexchange.furniture.RoomFurnitureDto;

public record FurnitureAddedPayload(
        RoomFurnitureDto furniture,
        Long placedByUserId,
        String placedByUsername
) {
}

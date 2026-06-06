package com.hotelexchange.realtime;

import com.hotelexchange.furniture.RoomFurnitureDto;

public record FurnitureRotatedPayload(
        RoomFurnitureDto furniture,
        Long rotatedByUserId,
        String rotatedByUsername
) {
}

package com.hotelexchange.realtime;

public record FurnitureRemovedPayload(
        Long furnitureId,
        String catalogCode,
        Long removedByUserId,
        String removedByUsername
) {
}

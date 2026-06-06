package com.hotelexchange.furniture;

import jakarta.validation.constraints.NotBlank;

public record PlaceFurnitureRequest(
        @NotBlank String catalogCode,
        int x,
        int y,
        String rotation
) {
}

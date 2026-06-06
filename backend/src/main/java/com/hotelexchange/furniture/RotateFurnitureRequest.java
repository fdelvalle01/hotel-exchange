package com.hotelexchange.furniture;

import jakarta.validation.constraints.NotBlank;

public record RotateFurnitureRequest(@NotBlank String rotation) {
}

package com.hotelexchange.realtime;

import java.util.List;

public record PresencePayload(
        List<PresenceUserDto> users
) {
}

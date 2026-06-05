package com.hotelexchange.status;

import com.hotelexchange.realtime.RoomPresenceRegistry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicStatusController {

    private final RoomPresenceRegistry presenceRegistry;

    public PublicStatusController(RoomPresenceRegistry presenceRegistry) {
        this.presenceRegistry = presenceRegistry;
    }

    @GetMapping("/status")
    public PublicStatusResponse status() {
        return new PublicStatusResponse(presenceRegistry.totalOnlineCount());
    }
}

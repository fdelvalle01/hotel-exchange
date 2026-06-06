package com.hotelexchange.inventory;

import com.hotelexchange.security.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserInventoryController {

    private final UserInventoryService userInventoryService;

    public UserInventoryController(UserInventoryService userInventoryService) {
        this.userInventoryService = userInventoryService;
    }

    @GetMapping("/api/me/inventory")
    public InventoryResponseDto myInventory(@AuthenticationPrincipal AuthenticatedUser principal) {
        return userInventoryService.getInventoryForUser(principal.id());
    }
}

package com.hotelexchange.inventory;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hotelexchange.security.AuthenticatedUser;
import com.hotelexchange.security.JwtService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(UserInventoryController.class)
class UserInventoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserInventoryService userInventoryService;

    @MockBean
    private JwtService jwtService;

    @Test
    void endpointWithoutTokenRejects() throws Exception {
        mockMvc.perform(get("/api/me/inventory"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedUserGetsOnlyOwnInventory() throws Exception {
        when(userInventoryService.getInventoryForUser(2L)).thenReturn(new InventoryResponseDto(List.of(
                new InventoryItemDto(
                        200L,
                        20L,
                        "dark_wood_coffee_table",
                        "Dark Wood Coffee Table",
                        "FLOOR",
                        "furniture_dark_wood_coffee_table",
                        "/assets/furniture/dark_wood_coffee_table.png",
                        2,
                        2,
                        1,
                        false,
                        false,
                        false,
                        true,
                        "EXCHANGE_DESK",
                        false
                )
        )));

        mockMvc.perform(get("/api/me/inventory")
                        .param("userId", "1")
                        .with(authentication(authenticatedUser(2L, "broker"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(200))
                .andExpect(jsonPath("$.items[0].catalogItemId").value(20))
                .andExpect(jsonPath("$.items[0].code").value("dark_wood_coffee_table"))
                .andExpect(jsonPath("$.items[0].name").value("Dark Wood Coffee Table"))
                .andExpect(jsonPath("$.items[0].spriteKey").value("furniture_dark_wood_coffee_table"))
                .andExpect(jsonPath("$.items[0].spritePath").value("/assets/furniture/dark_wood_coffee_table.png"))
                .andExpect(jsonPath("$.items[0].width").value(2))
                .andExpect(jsonPath("$.items[0].height").value(2))
                .andExpect(jsonPath("$.items[0].quantity").value(1))
                .andExpect(jsonPath("$.items[0].blocksMovement").value(true))
                .andExpect(jsonPath("$.items[0].interactionType").value("EXCHANGE_DESK"));

        verify(userInventoryService).getInventoryForUser(2L);
        verify(userInventoryService, never()).getInventoryForUser(1L);
    }

    private UsernamePasswordAuthenticationToken authenticatedUser(Long userId, String username) {
        return new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId, username, username),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }
}

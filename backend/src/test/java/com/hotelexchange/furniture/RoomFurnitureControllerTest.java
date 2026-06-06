package com.hotelexchange.furniture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelexchange.error.FurniturePlacementException;
import com.hotelexchange.inventory.InventoryItemDto;
import com.hotelexchange.realtime.RoomEventBroadcaster;
import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomRepository;
import com.hotelexchange.security.AuthenticatedUser;
import com.hotelexchange.security.JwtService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(RoomFurnitureController.class)
class RoomFurnitureControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RoomRepository roomRepository;

    @MockBean
    private FurniturePlacementService placementService;

    @MockBean
    private FurnitureRemovalService removalService;

    @MockBean
    private FurnitureRotationService rotationService;

    @MockBean
    private RoomEventBroadcaster broadcaster;

    @MockBean
    private JwtService jwtService;

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(post("/api/rooms/1/furniture")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"catalogCode\":\"chair\",\"x\":2,\"y\":3}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validPlacementReturns201WithFurnitureDto() throws Exception {
        RoomEntity room = roomEntity(1L);
        FurnitureCatalogEntity catalog = catalogEntity("chair");
        RoomFurnitureEntity furnitureEntity = furnitureEntity(99L, 2, 3, catalog);
        RoomFurnitureDto furnitureDto = RoomFurnitureDto.from(furnitureEntity, new ObjectMapper().createObjectNode());
        InventoryItemDto inventoryDto = new InventoryItemDto(
                10L, catalog.getId(), "chair", "Chair", "FLOOR",
                "furniture_chair", "/assets/furniture/chair.png",
                1, 1, 2, false, false, false, true, "NONE", false);
        PlaceFurnitureResponse response = new PlaceFurnitureResponse(furnitureDto, inventoryDto);

        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(placementService.placeFurniture(eq(7L), eq(room), any())).thenReturn(response);

        mockMvc.perform(post("/api/rooms/1/furniture")
                        .with(csrf())
                        .with(authentication(authenticatedUser(7L, "trader")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"catalogCode\":\"chair\",\"x\":2,\"y\":3,\"rotation\":\"SE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.placedFurniture.id").value(99))
                .andExpect(jsonPath("$.placedFurniture.x").value(2))
                .andExpect(jsonPath("$.placedFurniture.y").value(3))
                .andExpect(jsonPath("$.updatedInventoryItem.quantity").value(2));
    }

    @Test
    void placementExceptionReturns422() throws Exception {
        RoomEntity room = roomEntity(1L);

        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(placementService.placeFurniture(eq(7L), eq(room), any()))
                .thenThrow(new FurniturePlacementException("Tile (2, 3) is occupied by furniture"));

        mockMvc.perform(post("/api/rooms/1/furniture")
                        .with(csrf())
                        .with(authentication(authenticatedUser(7L, "trader")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"catalogCode\":\"chair\",\"x\":2,\"y\":3}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Tile (2, 3) is occupied by furniture"));
    }

    @Test
    void missingRoomReturns404() throws Exception {
        when(roomRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/rooms/999/furniture")
                        .with(csrf())
                        .with(authentication(authenticatedUser(7L, "trader")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"catalogCode\":\"chair\",\"x\":2,\"y\":3}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void validRotateReturns200WithFurnitureDto() throws Exception {
        RoomEntity room = roomEntity(1L);
        FurnitureCatalogEntity catalog = catalogEntity("chair");
        RoomFurnitureEntity furnitureEntity = furnitureEntity(99L, 2, 3, catalog);
        ReflectionTestUtils.setField(furnitureEntity, "rotation", "NE");
        RoomFurnitureDto furnitureDto = RoomFurnitureDto.from(furnitureEntity, new ObjectMapper().createObjectNode());
        RotateFurnitureResponse response = new RotateFurnitureResponse(furnitureDto);

        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(rotationService.rotateFurniture(eq(7L), eq(room), eq(99L), any())).thenReturn(response);

        mockMvc.perform(patch("/api/rooms/1/furniture/99/rotate")
                        .with(csrf())
                        .with(authentication(authenticatedUser(7L, "trader")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rotation\":\"NE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.furniture.id").value(99))
                .andExpect(jsonPath("$.furniture.rotation").value("NE"));
    }

    @Test
    void rotateMissingRoomReturns404() throws Exception {
        when(roomRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/api/rooms/999/furniture/1/rotate")
                        .with(csrf())
                        .with(authentication(authenticatedUser(7L, "trader")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rotation\":\"NE\"}"))
                .andExpect(status().isNotFound());
    }

    // ---- Helpers ----

    private UsernamePasswordAuthenticationToken authenticatedUser(Long userId, String username) {
        return new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId, username, username),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }

    private RoomEntity roomEntity(Long id) {
        RoomEntity room = new RoomEntity();
        ReflectionTestUtils.setField(room, "id", id);
        ReflectionTestUtils.setField(room, "name", "Test Room");
        ReflectionTestUtils.setField(room, "width", 12);
        ReflectionTestUtils.setField(room, "height", 12);
        ReflectionTestUtils.setField(room, "spawnX", 1);
        ReflectionTestUtils.setField(room, "spawnY", 1);
        return room;
    }

    private FurnitureCatalogEntity catalogEntity(String code) {
        FurnitureCatalogEntity cat = new FurnitureCatalogEntity();
        ReflectionTestUtils.setField(cat, "id", 1L);
        ReflectionTestUtils.setField(cat, "code", code);
        ReflectionTestUtils.setField(cat, "name", code);
        ReflectionTestUtils.setField(cat, "type", "FLOOR");
        ReflectionTestUtils.setField(cat, "spriteKey", "furniture_" + code);
        ReflectionTestUtils.setField(cat, "spritePath", "/assets/furniture/" + code + ".png");
        ReflectionTestUtils.setField(cat, "width", 1);
        ReflectionTestUtils.setField(cat, "height", 1);
        ReflectionTestUtils.setField(cat, "blocksMovement", true);
        ReflectionTestUtils.setField(cat, "canSit", false);
        ReflectionTestUtils.setField(cat, "canWalk", false);
        ReflectionTestUtils.setField(cat, "canStack", false);
        ReflectionTestUtils.setField(cat, "defaultZ", BigDecimal.ZERO);
        ReflectionTestUtils.setField(cat, "interactionType", "NONE");
        ReflectionTestUtils.setField(cat, "tradeable", false);
        return cat;
    }

    private RoomFurnitureEntity furnitureEntity(Long id, int x, int y, FurnitureCatalogEntity catalog) {
        RoomFurnitureEntity f = new RoomFurnitureEntity();
        ReflectionTestUtils.setField(f, "id", id);
        ReflectionTestUtils.setField(f, "catalogItem", catalog);
        ReflectionTestUtils.setField(f, "x", x);
        ReflectionTestUtils.setField(f, "y", y);
        ReflectionTestUtils.setField(f, "z", BigDecimal.ZERO);
        ReflectionTestUtils.setField(f, "rotation", "SE");
        ReflectionTestUtils.setField(f, "state", "{}");
        return f;
    }
}

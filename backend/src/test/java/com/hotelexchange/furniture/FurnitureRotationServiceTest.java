package com.hotelexchange.furniture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelexchange.error.FurniturePlacementException;
import com.hotelexchange.error.NotFoundException;
import com.hotelexchange.realtime.GridPosition;
import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomLayoutService;
import com.hotelexchange.user.UserEntity;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class FurnitureRotationServiceTest {

    @Mock
    private RoomFurnitureRepository roomFurnitureRepository;

    @Mock
    private RoomFurnitureService roomFurnitureService;

    @Mock
    private RoomLayoutService roomLayoutService;

    private FurnitureRotationService service;

    @BeforeEach
    void setUp() {
        service = new FurnitureRotationService(
                roomFurnitureRepository,
                roomFurnitureService,
                roomLayoutService,
                new ObjectMapper()
        );
    }

    @Test
    void ownerCanRotateFurnitureToNewRotation() {
        FurnitureCatalogEntity catalog = catalog("dark_wood_coffee_table", 2, 1);
        UserEntity owner = user(5L);
        RoomEntity room = room(1L, 12, 12);
        RoomFurnitureEntity furniture = furniture(99L, catalog, owner, 2, 3, "SE");

        when(roomFurnitureRepository.findByIdAndRoom_Id(99L, 1L)).thenReturn(Optional.of(furniture));
        when(roomFurnitureService.blockedTileSetExcluding(eq(room), eq(99L))).thenReturn(Set.of());
        when(roomLayoutService.tileExists(eq(room), anyInt(), anyInt())).thenReturn(true);
        when(roomLayoutService.isStructurallyWalkable(eq(room), anyInt(), anyInt())).thenReturn(true);
        when(roomFurnitureRepository.save(furniture)).thenReturn(furniture);

        RotateFurnitureResponse response = service.rotateFurniture(
                5L, room, 99L, new RotateFurnitureRequest("NE"));

        assertThat(response.furniture().rotation()).isEqualTo("NE");
        verify(roomFurnitureRepository).save(furniture);
    }

    @Test
    void sameRotationReturnsEarlyWithoutSave() {
        FurnitureCatalogEntity catalog = catalog("red_executive_chair", 1, 1);
        UserEntity owner = user(5L);
        RoomEntity room = room(1L, 12, 12);
        RoomFurnitureEntity furniture = furniture(42L, catalog, owner, 2, 2, "SE");

        when(roomFurnitureRepository.findByIdAndRoom_Id(42L, 1L)).thenReturn(Optional.of(furniture));

        RotateFurnitureResponse response = service.rotateFurniture(
                5L, room, 42L, new RotateFurnitureRequest("SE"));

        assertThat(response.furniture().rotation()).isEqualTo("SE");
        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void otherUserCannotRotateFurnitureTheyDoNotOwn() {
        FurnitureCatalogEntity catalog = catalog("green_leather_sofa", 2, 1);
        UserEntity owner = user(5L);
        RoomEntity room = room(1L, 12, 12);
        RoomFurnitureEntity furniture = furniture(99L, catalog, owner, 2, 3, "SE");

        when(roomFurnitureRepository.findByIdAndRoom_Id(99L, 1L)).thenReturn(Optional.of(furniture));

        assertThatThrownBy(() -> service.rotateFurniture(7L, room, 99L, new RotateFurnitureRequest("NE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("only rotate your own");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void systemDecorWithNullOwnerCannotBeRotated() {
        FurnitureCatalogEntity catalog = catalog("system_plant", 1, 1);
        RoomEntity room = room(1L, 12, 12);
        RoomFurnitureEntity furniture = furniture(55L, catalog, null, 3, 3, "SE");

        when(roomFurnitureRepository.findByIdAndRoom_Id(55L, 1L)).thenReturn(Optional.of(furniture));

        assertThatThrownBy(() -> service.rotateFurniture(5L, room, 55L, new RotateFurnitureRequest("NE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("System furniture cannot be rotated");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void nonExistentFurnitureReturnsNotFound() {
        RoomEntity room = room(1L, 12, 12);

        when(roomFurnitureRepository.findByIdAndRoom_Id(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotateFurniture(5L, room, 999L, new RotateFurnitureRequest("NE")))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("not found");
    }

    @Test
    void invalidRotationValueThrowsException() {
        FurnitureCatalogEntity catalog = catalog("red_executive_chair", 1, 1);
        UserEntity owner = user(5L);
        RoomEntity room = room(1L, 12, 12);
        RoomFurnitureEntity furniture = furniture(42L, catalog, owner, 2, 2, "SE");

        when(roomFurnitureRepository.findByIdAndRoom_Id(42L, 1L)).thenReturn(Optional.of(furniture));

        assertThatThrownBy(() -> service.rotateFurniture(5L, room, 42L, new RotateFurnitureRequest("NORTH")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("Invalid rotation");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void rotationFailsWhenFootprintExceedsRoom() {
        FurnitureCatalogEntity catalog = catalog("dark_wood_coffee_table", 2, 1);
        UserEntity owner = user(5L);
        RoomEntity room = room(1L, 12, 12);
        // NE swaps to 1×2; placing at x=2,y=3 means tiles (2,3) and (2,4)
        RoomFurnitureEntity furniture = furniture(99L, catalog, owner, 2, 3, "SE");

        when(roomFurnitureRepository.findByIdAndRoom_Id(99L, 1L)).thenReturn(Optional.of(furniture));
        when(roomFurnitureService.blockedTileSetExcluding(eq(room), eq(99L))).thenReturn(Set.of());
        // First tile exists, second tile does not
        when(roomLayoutService.tileExists(eq(room), eq(2), eq(3))).thenReturn(true);
        when(roomLayoutService.isStructurallyWalkable(eq(room), eq(2), eq(3))).thenReturn(true);
        when(roomLayoutService.tileExists(eq(room), eq(2), eq(4))).thenReturn(false);

        assertThatThrownBy(() -> service.rotateFurniture(5L, room, 99L, new RotateFurnitureRequest("NE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("(2, 4)");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void rotationFailsWhenFootprintCollidesWithOtherFurniture() {
        FurnitureCatalogEntity catalog = catalog("dark_wood_coffee_table", 2, 1);
        UserEntity owner = user(5L);
        RoomEntity room = room(1L, 12, 12);
        RoomFurnitureEntity furniture = furniture(99L, catalog, owner, 2, 3, "SE");

        when(roomFurnitureRepository.findByIdAndRoom_Id(99L, 1L)).thenReturn(Optional.of(furniture));
        // NE rotation → 1×2 → tiles (2,3) and (2,4); another piece occupies (2,4)
        when(roomFurnitureService.blockedTileSetExcluding(eq(room), eq(99L)))
                .thenReturn(Set.of(new GridPosition(2, 4)));
        when(roomLayoutService.tileExists(eq(room), anyInt(), anyInt())).thenReturn(true);
        when(roomLayoutService.isStructurallyWalkable(eq(room), anyInt(), anyInt())).thenReturn(true);

        assertThatThrownBy(() -> service.rotateFurniture(5L, room, 99L, new RotateFurnitureRequest("NE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("(2, 4)");

        verify(roomFurnitureRepository, never()).save(any());
    }

    // ---- Helpers ----

    private FurnitureCatalogEntity catalog(String code, int width, int height) {
        FurnitureCatalogEntity cat = new FurnitureCatalogEntity();
        ReflectionTestUtils.setField(cat, "id", (long) code.hashCode());
        ReflectionTestUtils.setField(cat, "code", code);
        ReflectionTestUtils.setField(cat, "name", code);
        ReflectionTestUtils.setField(cat, "type", "FLOOR");
        ReflectionTestUtils.setField(cat, "spriteKey", "furniture_" + code);
        ReflectionTestUtils.setField(cat, "spritePath", "/assets/furniture/" + code + ".png");
        ReflectionTestUtils.setField(cat, "width", width);
        ReflectionTestUtils.setField(cat, "height", height);
        ReflectionTestUtils.setField(cat, "blocksMovement", true);
        ReflectionTestUtils.setField(cat, "canSit", false);
        ReflectionTestUtils.setField(cat, "canWalk", false);
        ReflectionTestUtils.setField(cat, "canStack", false);
        ReflectionTestUtils.setField(cat, "defaultZ", BigDecimal.ZERO);
        ReflectionTestUtils.setField(cat, "interactionType", "NONE");
        ReflectionTestUtils.setField(cat, "tradeable", false);
        return cat;
    }

    private UserEntity user(Long id) {
        UserEntity u = new UserEntity();
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private RoomEntity room(Long id, int width, int height) {
        RoomEntity room = new RoomEntity();
        ReflectionTestUtils.setField(room, "id", id);
        ReflectionTestUtils.setField(room, "width", width);
        ReflectionTestUtils.setField(room, "height", height);
        return room;
    }

    private RoomFurnitureEntity furniture(Long id, FurnitureCatalogEntity catalog,
            UserEntity owner, int x, int y, String rotation) {
        RoomFurnitureEntity f = new RoomFurnitureEntity();
        ReflectionTestUtils.setField(f, "id", id);
        ReflectionTestUtils.setField(f, "catalogItem", catalog);
        ReflectionTestUtils.setField(f, "ownerUser", owner);
        ReflectionTestUtils.setField(f, "x", x);
        ReflectionTestUtils.setField(f, "y", y);
        ReflectionTestUtils.setField(f, "z", BigDecimal.ZERO);
        ReflectionTestUtils.setField(f, "rotation", rotation);
        ReflectionTestUtils.setField(f, "state", "{}");
        return f;
    }
}

package com.hotelexchange.furniture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelexchange.realtime.GridPosition;
import com.hotelexchange.room.RoomEntity;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RoomFurnitureServiceTest {

    @Mock
    private RoomFurnitureRepository roomFurnitureRepository;

    private RoomFurnitureService service;

    @BeforeEach
    void setUp() {
        service = new RoomFurnitureService(new ObjectMapper(), roomFurnitureRepository);
    }

    @Test
    void blockedTileSetUsesFullCatalogFootprint() {
        RoomEntity room = room(1L, 12, 12);
        RoomFurnitureEntity table = furniture(
                "dark_wood_coffee_table",
                5,
                7,
                "SE",
                catalog("dark_wood_coffee_table", 2, 2, true, false)
        );
        when(roomFurnitureRepository.findByRoom_IdOrderByIdAsc(1L)).thenReturn(List.of(table));

        Set<GridPosition> blockedTiles = service.blockedTileSet(room);

        assertThat(blockedTiles).containsExactlyInAnyOrder(
                new GridPosition(5, 7),
                new GridPosition(6, 7),
                new GridPosition(5, 8),
                new GridPosition(6, 8)
        );
    }

    @Test
    void rotatedFurnitureSwapsFootprintForNorthEastAndSouthWest() {
        RoomEntity room = room(1L, 12, 12);
        RoomFurnitureEntity sofa = furniture(
                "green_leather_sofa",
                2,
                6,
                "NE",
                catalog("green_leather_sofa", 3, 1, true, false)
        );
        when(roomFurnitureRepository.findByRoom_IdOrderByIdAsc(1L)).thenReturn(List.of(sofa));

        Set<GridPosition> blockedTiles = service.blockedTileSet(room);

        assertThat(blockedTiles).containsExactlyInAnyOrder(
                new GridPosition(2, 6),
                new GridPosition(2, 7),
                new GridPosition(2, 8)
        );
    }

    @Test
    void canWalkFurnitureDoesNotBlockMovement() {
        RoomEntity room = room(1L, 12, 12);
        RoomFurnitureEntity rug = furniture(
                "exchange_rug",
                4,
                10,
                "SE",
                catalog("exchange_rug", 4, 2, true, true)
        );
        when(roomFurnitureRepository.findByRoom_IdOrderByIdAsc(1L)).thenReturn(List.of(rug));

        assertThat(service.blockedTileSet(room)).isEmpty();
    }

    private RoomEntity room(Long id, int width, int height) {
        RoomEntity room = new RoomEntity();
        ReflectionTestUtils.setField(room, "id", id);
        ReflectionTestUtils.setField(room, "name", "Main Lobby");
        ReflectionTestUtils.setField(room, "width", width);
        ReflectionTestUtils.setField(room, "height", height);
        ReflectionTestUtils.setField(room, "spawnX", 1);
        ReflectionTestUtils.setField(room, "spawnY", 1);
        return room;
    }

    private RoomFurnitureEntity furniture(
            String id,
            int x,
            int y,
            String rotation,
            FurnitureCatalogEntity catalogItem
    ) {
        RoomFurnitureEntity furniture = new RoomFurnitureEntity();
        ReflectionTestUtils.setField(furniture, "id", 1L);
        ReflectionTestUtils.setField(furniture, "catalogItem", catalogItem);
        ReflectionTestUtils.setField(furniture, "x", x);
        ReflectionTestUtils.setField(furniture, "y", y);
        ReflectionTestUtils.setField(furniture, "z", BigDecimal.ZERO);
        ReflectionTestUtils.setField(furniture, "rotation", rotation);
        ReflectionTestUtils.setField(furniture, "state", "{\"id\":\"" + id + "\"}");
        return furniture;
    }

    private FurnitureCatalogEntity catalog(
            String code,
            int width,
            int height,
            boolean blocksMovement,
            boolean canWalk
    ) {
        FurnitureCatalogEntity catalogItem = new FurnitureCatalogEntity();
        ReflectionTestUtils.setField(catalogItem, "code", code);
        ReflectionTestUtils.setField(catalogItem, "name", code);
        ReflectionTestUtils.setField(catalogItem, "type", "FLOOR");
        ReflectionTestUtils.setField(catalogItem, "spriteKey", "furniture_" + code);
        ReflectionTestUtils.setField(catalogItem, "spritePath", "/assets/furniture/" + code + ".png");
        ReflectionTestUtils.setField(catalogItem, "width", width);
        ReflectionTestUtils.setField(catalogItem, "height", height);
        ReflectionTestUtils.setField(catalogItem, "blocksMovement", blocksMovement);
        ReflectionTestUtils.setField(catalogItem, "canSit", false);
        ReflectionTestUtils.setField(catalogItem, "canWalk", canWalk);
        ReflectionTestUtils.setField(catalogItem, "canStack", false);
        ReflectionTestUtils.setField(catalogItem, "defaultZ", BigDecimal.ZERO);
        ReflectionTestUtils.setField(catalogItem, "interactionType", "NONE");
        ReflectionTestUtils.setField(catalogItem, "tradeable", false);
        return catalogItem;
    }
}

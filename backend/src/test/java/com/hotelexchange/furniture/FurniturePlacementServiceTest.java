package com.hotelexchange.furniture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelexchange.error.FurniturePlacementException;
import com.hotelexchange.inventory.UserInventoryEntity;
import com.hotelexchange.inventory.UserInventoryRepository;
import com.hotelexchange.realtime.GridPosition;
import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomLayoutService;
import com.hotelexchange.user.UserEntity;
import com.hotelexchange.user.UserRepository;
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
class FurniturePlacementServiceTest {

    @Mock
    private FurnitureCatalogRepository furnitureCatalogRepository;

    @Mock
    private RoomFurnitureRepository roomFurnitureRepository;

    @Mock
    private UserInventoryRepository userInventoryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoomLayoutService roomLayoutService;

    @Mock
    private RoomFurnitureService roomFurnitureService;

    private FurniturePlacementService service;

    @BeforeEach
    void setUp() {
        service = new FurniturePlacementService(
                furnitureCatalogRepository,
                roomFurnitureRepository,
                userInventoryRepository,
                userRepository,
                roomLayoutService,
                roomFurnitureService,
                new ObjectMapper()
        );
    }

    @Test
    void validPlacementInsertsFurnitureAndDecrementsInventory() {
        RoomEntity room = room(1L, 12, 12);
        FurnitureCatalogEntity catalog = catalog("chair", 1, 1, true, false);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 3);
        RoomFurnitureEntity savedFurniture = furniture(99L, 2, 3, "SE", catalog);

        when(furnitureCatalogRepository.findByCode("chair")).thenReturn(Optional.of(catalog));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));
        when(roomLayoutService.tileExists(room, 2, 3)).thenReturn(true);
        when(roomLayoutService.isStructurallyWalkable(room, 2, 3)).thenReturn(true);
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of());
        when(userRepository.getReferenceById(5L)).thenReturn(new UserEntity());
        when(roomFurnitureRepository.save(any())).thenReturn(savedFurniture);
        when(userInventoryRepository.save(any())).thenReturn(inventoryItem);

        PlaceFurnitureResponse response = service.placeFurniture(5L, room, new PlaceFurnitureRequest("chair", 2, 3, "SE"));

        assertThat(response.placedFurniture().id()).isEqualTo(99L);
        assertThat(response.placedFurniture().x()).isEqualTo(2);
        assertThat(response.placedFurniture().y()).isEqualTo(3);
        verify(roomFurnitureRepository).save(any(RoomFurnitureEntity.class));
        verify(userInventoryRepository).save(inventoryItem);
        assertThat(inventoryItem.getQuantity()).isEqualTo(2);
    }

    @Test
    void rejectsWhenItemNotInInventory() {
        RoomEntity room = room(1L, 12, 12);
        FurnitureCatalogEntity catalog = catalog("chair", 1, 1, true, false);

        when(furnitureCatalogRepository.findByCode("chair")).thenReturn(Optional.of(catalog));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.placeFurniture(5L, room, new PlaceFurnitureRequest("chair", 2, 3, "SE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("not in inventory");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void rejectsWhenQuantityIsZero() {
        RoomEntity room = room(1L, 12, 12);
        FurnitureCatalogEntity catalog = catalog("chair", 1, 1, true, false);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 0);

        when(furnitureCatalogRepository.findByCode("chair")).thenReturn(Optional.of(catalog));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));

        assertThatThrownBy(() -> service.placeFurniture(5L, room, new PlaceFurnitureRequest("chair", 2, 3, "SE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("No remaining inventory");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void rejectsWhenTileDoesNotExist() {
        RoomEntity room = room(1L, 12, 12);
        FurnitureCatalogEntity catalog = catalog("chair", 1, 1, true, false);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 1);

        when(furnitureCatalogRepository.findByCode("chair")).thenReturn(Optional.of(catalog));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of());
        when(roomLayoutService.tileExists(room, 0, 0)).thenReturn(false);

        assertThatThrownBy(() -> service.placeFurniture(5L, room, new PlaceFurnitureRequest("chair", 0, 0, "SE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("does not exist");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void rejectsWhenTileIsStructurallyBlocked() {
        RoomEntity room = room(1L, 12, 12);
        FurnitureCatalogEntity catalog = catalog("chair", 1, 1, true, false);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 1);

        when(furnitureCatalogRepository.findByCode("chair")).thenReturn(Optional.of(catalog));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of());
        when(roomLayoutService.tileExists(room, 1, 1)).thenReturn(true);
        when(roomLayoutService.isStructurallyWalkable(room, 1, 1)).thenReturn(false);

        assertThatThrownBy(() -> service.placeFurniture(5L, room, new PlaceFurnitureRequest("chair", 1, 1, "SE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("not walkable");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void rejectsWhenTileIsBlockedByExistingFurniture() {
        RoomEntity room = room(1L, 12, 12);
        FurnitureCatalogEntity catalog = catalog("chair", 1, 1, true, false);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 1);

        when(furnitureCatalogRepository.findByCode("chair")).thenReturn(Optional.of(catalog));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of(new GridPosition(4, 4)));
        when(roomLayoutService.tileExists(room, 4, 4)).thenReturn(true);
        when(roomLayoutService.isStructurallyWalkable(room, 4, 4)).thenReturn(true);

        assertThatThrownBy(() -> service.placeFurniture(5L, room, new PlaceFurnitureRequest("chair", 4, 4, "SE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("occupied by furniture");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void rejectsWhen2x2FootprintPartiallyOutsideRoom() {
        RoomEntity room = room(1L, 12, 12);
        FurnitureCatalogEntity catalog = catalog("table", 2, 2, true, false);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 1);

        when(furnitureCatalogRepository.findByCode("table")).thenReturn(Optional.of(catalog));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of());
        when(roomLayoutService.tileExists(room, 11, 11)).thenReturn(true);
        when(roomLayoutService.isStructurallyWalkable(room, 11, 11)).thenReturn(true);
        when(roomLayoutService.tileExists(room, 12, 11)).thenReturn(false);

        assertThatThrownBy(() -> service.placeFurniture(5L, room, new PlaceFurnitureRequest("table", 11, 11, "SE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("does not exist");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void valid2x2PlacementBlocksAllFourTiles() {
        RoomEntity room = room(1L, 12, 12);
        FurnitureCatalogEntity catalog = catalog("table", 2, 2, true, false);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 2);
        RoomFurnitureEntity savedFurniture = furniture(50L, 3, 3, "SE", catalog);

        when(furnitureCatalogRepository.findByCode("table")).thenReturn(Optional.of(catalog));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of());
        for (int dy = 0; dy < 2; dy++) {
            for (int dx = 0; dx < 2; dx++) {
                when(roomLayoutService.tileExists(room, 3 + dx, 3 + dy)).thenReturn(true);
                when(roomLayoutService.isStructurallyWalkable(room, 3 + dx, 3 + dy)).thenReturn(true);
            }
        }
        when(userRepository.getReferenceById(5L)).thenReturn(new UserEntity());
        when(roomFurnitureRepository.save(any())).thenReturn(savedFurniture);
        when(userInventoryRepository.save(any())).thenReturn(inventoryItem);

        PlaceFurnitureResponse response = service.placeFurniture(5L, room, new PlaceFurnitureRequest("table", 3, 3, "SE"));

        assertThat(response.placedFurniture().id()).isEqualTo(50L);
        assertThat(inventoryItem.getQuantity()).isEqualTo(1);
    }

    @Test
    void unknownCatalogCodeThrowsPlacementException() {
        RoomEntity room = room(1L, 12, 12);

        when(furnitureCatalogRepository.findByCode("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.placeFurniture(5L, room, new PlaceFurnitureRequest("nonexistent", 2, 3, "SE")))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("Furniture not found");

        verify(roomFurnitureRepository, never()).save(any());
    }

    @Test
    void inventoryDecrementedToZeroIsKeptForTraceability() {
        RoomEntity room = room(1L, 12, 12);
        FurnitureCatalogEntity catalog = catalog("chair", 1, 1, true, false);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 1);
        RoomFurnitureEntity savedFurniture = furniture(77L, 5, 5, "SE", catalog);

        when(furnitureCatalogRepository.findByCode("chair")).thenReturn(Optional.of(catalog));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));
        when(roomLayoutService.tileExists(room, 5, 5)).thenReturn(true);
        when(roomLayoutService.isStructurallyWalkable(room, 5, 5)).thenReturn(true);
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of());
        when(userRepository.getReferenceById(5L)).thenReturn(new UserEntity());
        when(roomFurnitureRepository.save(any())).thenReturn(savedFurniture);
        when(userInventoryRepository.save(any())).thenReturn(inventoryItem);

        PlaceFurnitureResponse response = service.placeFurniture(5L, room, new PlaceFurnitureRequest("chair", 5, 5, "SE"));

        assertThat(inventoryItem.getQuantity()).isEqualTo(0);
        assertThat(response.updatedInventoryItem().quantity()).isEqualTo(0);
        verify(userInventoryRepository).save(inventoryItem);
    }

    // ---- Helpers ----

    private RoomEntity room(Long id, int width, int height) {
        RoomEntity room = new RoomEntity();
        ReflectionTestUtils.setField(room, "id", id);
        ReflectionTestUtils.setField(room, "name", "Test Room");
        ReflectionTestUtils.setField(room, "width", width);
        ReflectionTestUtils.setField(room, "height", height);
        ReflectionTestUtils.setField(room, "spawnX", 1);
        ReflectionTestUtils.setField(room, "spawnY", 1);
        return room;
    }

    private FurnitureCatalogEntity catalog(String code, int width, int height, boolean blocksMovement, boolean canWalk) {
        FurnitureCatalogEntity cat = new FurnitureCatalogEntity();
        ReflectionTestUtils.setField(cat, "id", (long) code.hashCode());
        ReflectionTestUtils.setField(cat, "code", code);
        ReflectionTestUtils.setField(cat, "name", code);
        ReflectionTestUtils.setField(cat, "type", "FLOOR");
        ReflectionTestUtils.setField(cat, "spriteKey", "furniture_" + code);
        ReflectionTestUtils.setField(cat, "spritePath", "/assets/furniture/" + code + ".png");
        ReflectionTestUtils.setField(cat, "width", width);
        ReflectionTestUtils.setField(cat, "height", height);
        ReflectionTestUtils.setField(cat, "blocksMovement", blocksMovement);
        ReflectionTestUtils.setField(cat, "canSit", false);
        ReflectionTestUtils.setField(cat, "canWalk", canWalk);
        ReflectionTestUtils.setField(cat, "canStack", false);
        ReflectionTestUtils.setField(cat, "defaultZ", BigDecimal.ZERO);
        ReflectionTestUtils.setField(cat, "interactionType", "NONE");
        ReflectionTestUtils.setField(cat, "tradeable", false);
        return cat;
    }

    private UserInventoryEntity inventory(Long id, FurnitureCatalogEntity catalogItem, int quantity) {
        UserInventoryEntity inv = new UserInventoryEntity(null, catalogItem, quantity, "SEED");
        ReflectionTestUtils.setField(inv, "id", id);
        return inv;
    }

    private RoomFurnitureEntity furniture(Long id, int x, int y, String rotation, FurnitureCatalogEntity catalogItem) {
        RoomFurnitureEntity f = new RoomFurnitureEntity();
        ReflectionTestUtils.setField(f, "id", id);
        ReflectionTestUtils.setField(f, "catalogItem", catalogItem);
        ReflectionTestUtils.setField(f, "x", x);
        ReflectionTestUtils.setField(f, "y", y);
        ReflectionTestUtils.setField(f, "z", BigDecimal.ZERO);
        ReflectionTestUtils.setField(f, "rotation", rotation);
        ReflectionTestUtils.setField(f, "state", "{}");
        return f;
    }
}

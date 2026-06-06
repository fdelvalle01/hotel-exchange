package com.hotelexchange.furniture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.hotelexchange.error.FurniturePlacementException;
import com.hotelexchange.error.NotFoundException;
import com.hotelexchange.inventory.UserInventoryEntity;
import com.hotelexchange.inventory.UserInventoryRepository;
import com.hotelexchange.user.UserEntity;
import com.hotelexchange.user.UserRepository;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class FurnitureRemovalServiceTest {

    @Mock
    private RoomFurnitureRepository roomFurnitureRepository;

    @Mock
    private UserInventoryRepository userInventoryRepository;

    @Mock
    private UserRepository userRepository;

    private FurnitureRemovalService service;

    @BeforeEach
    void setUp() {
        service = new FurnitureRemovalService(
                roomFurnitureRepository,
                userInventoryRepository,
                userRepository
        );
    }

    @Test
    void ownerCanRemoveFurnitureAndGetItBack() {
        FurnitureCatalogEntity catalog = catalog("green_leather_sofa", 2, 1);
        UserEntity owner = user(5L);
        RoomFurnitureEntity furniture = furniture(99L, catalog, owner);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 0);

        when(roomFurnitureRepository.findByIdAndRoom_Id(99L, 1L)).thenReturn(Optional.of(furniture));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));
        when(userInventoryRepository.save(any())).thenReturn(inventoryItem);

        RemoveFurnitureResponse response = service.removeFurniture(5L, 1L, 99L);

        assertThat(response.removedFurnitureId()).isEqualTo(99L);
        assertThat(response.catalogCode()).isEqualTo("green_leather_sofa");
        verify(roomFurnitureRepository).delete(furniture);
    }

    @Test
    void removingFurnitureIncrementsInventoryQuantity() {
        FurnitureCatalogEntity catalog = catalog("red_executive_chair", 1, 1);
        UserEntity owner = user(5L);
        RoomFurnitureEntity furniture = furniture(42L, catalog, owner);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 2);

        when(roomFurnitureRepository.findByIdAndRoom_Id(42L, 1L)).thenReturn(Optional.of(furniture));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));
        when(userInventoryRepository.save(any())).thenReturn(inventoryItem);

        service.removeFurniture(5L, 1L, 42L);

        assertThat(inventoryItem.getQuantity()).isEqualTo(3);
        verify(userInventoryRepository).save(inventoryItem);
    }

    @Test
    void otherUserCannotRemoveFurnitureTheyDoNotOwn() {
        FurnitureCatalogEntity catalog = catalog("green_leather_sofa", 2, 1);
        UserEntity owner = user(5L);
        RoomFurnitureEntity furniture = furniture(99L, catalog, owner);

        when(roomFurnitureRepository.findByIdAndRoom_Id(99L, 1L)).thenReturn(Optional.of(furniture));

        assertThatThrownBy(() -> service.removeFurniture(7L, 1L, 99L))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("do not own");

        verify(roomFurnitureRepository, never()).delete(any());
        verify(userInventoryRepository, never()).save(any());
    }

    @Test
    void systemDecorWithNullOwnerCannotBeRemoved() {
        FurnitureCatalogEntity catalog = catalog("system_plant", 1, 1);
        RoomFurnitureEntity furniture = furniture(55L, catalog, null);

        when(roomFurnitureRepository.findByIdAndRoom_Id(55L, 1L)).thenReturn(Optional.of(furniture));

        assertThatThrownBy(() -> service.removeFurniture(5L, 1L, 55L))
                .isInstanceOf(FurniturePlacementException.class)
                .hasMessageContaining("system furniture");

        verify(roomFurnitureRepository, never()).delete(any());
        verify(userInventoryRepository, never()).save(any());
    }

    @Test
    void nonExistentFurnitureReturnsNotFound() {
        when(roomFurnitureRepository.findByIdAndRoom_Id(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.removeFurniture(5L, 1L, 999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("not found");

        verify(roomFurnitureRepository, never()).delete(any());
    }

    @Test
    void furnitureFromDifferentRoomReturnsNotFound() {
        when(roomFurnitureRepository.findByIdAndRoom_Id(99L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.removeFurniture(5L, 2L, 99L))
                .isInstanceOf(NotFoundException.class);

        verify(roomFurnitureRepository, never()).delete(any());
    }

    @Test
    void removalCreatesInventoryEntryWhenNoneExists() {
        FurnitureCatalogEntity catalog = catalog("red_executive_chair", 1, 1);
        UserEntity owner = user(5L);
        RoomFurnitureEntity furniture = furniture(42L, catalog, owner);
        UserEntity userRef = user(5L);
        UserInventoryEntity newItem = new UserInventoryEntity(userRef, catalog, 0, "PLACED_RETURN");
        ReflectionTestUtils.setField(newItem, "id", 99L);

        when(roomFurnitureRepository.findByIdAndRoom_Id(42L, 1L)).thenReturn(Optional.of(furniture));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.empty());
        when(userRepository.getReferenceById(5L)).thenReturn(userRef);
        when(userInventoryRepository.save(any())).thenAnswer(inv -> {
            UserInventoryEntity item = inv.getArgument(0);
            return item;
        });

        RemoveFurnitureResponse response = service.removeFurniture(5L, 1L, 42L);

        verify(userInventoryRepository).save(any(UserInventoryEntity.class));
        assertThat(response.removedFurnitureId()).isEqualTo(42L);
    }

    @Test
    void removalIsTransactional_deleteAndInventoryHappenTogether() {
        FurnitureCatalogEntity catalog = catalog("dark_wood_coffee_table", 2, 2);
        UserEntity owner = user(5L);
        RoomFurnitureEntity furniture = furniture(77L, catalog, owner);
        UserInventoryEntity inventoryItem = inventory(10L, catalog, 1);

        when(roomFurnitureRepository.findByIdAndRoom_Id(77L, 1L)).thenReturn(Optional.of(furniture));
        when(userInventoryRepository.findInventoryItemForUserAndCatalog(5L, catalog.getId()))
                .thenReturn(Optional.of(inventoryItem));
        when(userInventoryRepository.save(any())).thenReturn(inventoryItem);

        service.removeFurniture(5L, 1L, 77L);

        // Both operations must be called in the same transaction
        verify(roomFurnitureRepository).delete(furniture);
        verify(userInventoryRepository).save(inventoryItem);
        assertThat(inventoryItem.getQuantity()).isEqualTo(2);
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

    private RoomFurnitureEntity furniture(Long id, FurnitureCatalogEntity catalogItem, UserEntity owner) {
        RoomFurnitureEntity f = new RoomFurnitureEntity();
        ReflectionTestUtils.setField(f, "id", id);
        ReflectionTestUtils.setField(f, "catalogItem", catalogItem);
        ReflectionTestUtils.setField(f, "ownerUser", owner);
        ReflectionTestUtils.setField(f, "x", 2);
        ReflectionTestUtils.setField(f, "y", 3);
        ReflectionTestUtils.setField(f, "z", BigDecimal.ZERO);
        ReflectionTestUtils.setField(f, "rotation", "SE");
        ReflectionTestUtils.setField(f, "state", "{}");
        return f;
    }

    private UserInventoryEntity inventory(Long id, FurnitureCatalogEntity catalogItem, int quantity) {
        UserInventoryEntity inv = new UserInventoryEntity(null, catalogItem, quantity, "SEED");
        ReflectionTestUtils.setField(inv, "id", id);
        return inv;
    }
}

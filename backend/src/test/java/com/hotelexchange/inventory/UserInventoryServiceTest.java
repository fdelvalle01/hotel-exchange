package com.hotelexchange.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.hotelexchange.error.NotFoundException;
import com.hotelexchange.furniture.FurnitureCatalogEntity;
import com.hotelexchange.user.UserEntity;
import com.hotelexchange.user.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class UserInventoryServiceTest {

    @Mock
    private UserInventoryRepository userInventoryRepository;

    @Mock
    private UserRepository userRepository;

    private UserInventoryService service;

    @BeforeEach
    void setUp() {
        service = new UserInventoryService(userInventoryRepository, userRepository);
    }

    @Test
    void getInventoryForUserReturnsFurnitureMetadata() {
        UserEntity trader = user(1L, "trader");
        FurnitureCatalogEntity sofa = catalog(
                10L,
                "green_leather_sofa",
                "Green Leather Sofa",
                3,
                1,
                true,
                false,
                "SEAT",
                false
        );
        UserInventoryEntity inventoryItem = inventory(100L, trader, sofa, 1);
        when(userRepository.existsById(1L)).thenReturn(true);
        when(userInventoryRepository.findInventoryForUser(1L)).thenReturn(List.of(inventoryItem));

        InventoryResponseDto response = service.getInventoryForUser(1L);

        assertThat(response.items()).hasSize(1);
        InventoryItemDto item = response.items().get(0);
        assertThat(item.id()).isEqualTo(100L);
        assertThat(item.catalogItemId()).isEqualTo(10L);
        assertThat(item.code()).isEqualTo("green_leather_sofa");
        assertThat(item.name()).isEqualTo("Green Leather Sofa");
        assertThat(item.spriteKey()).isEqualTo("furniture_green_leather_sofa");
        assertThat(item.spritePath()).isEqualTo("/assets/furniture/green_leather_sofa.png");
        assertThat(item.width()).isEqualTo(3);
        assertThat(item.height()).isEqualTo(1);
        assertThat(item.quantity()).isEqualTo(1);
        assertThat(item.canSit()).isTrue();
        assertThat(item.canWalk()).isFalse();
        assertThat(item.blocksMovement()).isTrue();
        assertThat(item.interactionType()).isEqualTo("SEAT");
        assertThat(item.tradeable()).isFalse();
    }

    @Test
    void getInventoryForUserUsesOnlyRequestedAuthenticatedUserId() {
        when(userRepository.existsById(2L)).thenReturn(true);
        when(userInventoryRepository.findInventoryForUser(2L)).thenReturn(List.of());

        service.getInventoryForUser(2L);

        verify(userInventoryRepository).findInventoryForUser(2L);
        verify(userInventoryRepository, never()).findInventoryForUser(1L);
    }

    @Test
    void getInventoryForMissingUserFails() {
        when(userRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.getInventoryForUser(99L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("User not found");

        verify(userInventoryRepository, never()).findInventoryForUser(99L);
    }

    @Test
    void inventoryQuantityCannotBeNegative() {
        assertThatThrownBy(() -> new UserInventoryEntity(
                user(1L, "trader"),
                catalog(10L, "green_leather_sofa", "Green Leather Sofa", 3, 1, true, false, "SEAT", false),
                -1,
                "SEED"
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("quantity");
    }

    private UserInventoryEntity inventory(
            Long id,
            UserEntity user,
            FurnitureCatalogEntity catalogItem,
            int quantity
    ) {
        UserInventoryEntity entity = new UserInventoryEntity(user, catalogItem, quantity, "SEED");
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }

    private UserEntity user(Long id, String username) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "id", id);
        user.setUsername(username);
        user.setDisplayName(username);
        user.setPasswordHash("hash");
        return user;
    }

    private FurnitureCatalogEntity catalog(
            Long id,
            String code,
            String name,
            int width,
            int height,
            boolean canSit,
            boolean canWalk,
            String interactionType,
            boolean tradeable
    ) {
        FurnitureCatalogEntity catalogItem = new FurnitureCatalogEntity();
        ReflectionTestUtils.setField(catalogItem, "id", id);
        ReflectionTestUtils.setField(catalogItem, "code", code);
        ReflectionTestUtils.setField(catalogItem, "name", name);
        ReflectionTestUtils.setField(catalogItem, "type", "FLOOR");
        ReflectionTestUtils.setField(catalogItem, "spriteKey", "furniture_" + code);
        ReflectionTestUtils.setField(catalogItem, "spritePath", "/assets/furniture/" + code + ".png");
        ReflectionTestUtils.setField(catalogItem, "width", width);
        ReflectionTestUtils.setField(catalogItem, "height", height);
        ReflectionTestUtils.setField(catalogItem, "blocksMovement", !canWalk);
        ReflectionTestUtils.setField(catalogItem, "canSit", canSit);
        ReflectionTestUtils.setField(catalogItem, "canWalk", canWalk);
        ReflectionTestUtils.setField(catalogItem, "canStack", false);
        ReflectionTestUtils.setField(catalogItem, "defaultZ", BigDecimal.ZERO);
        ReflectionTestUtils.setField(catalogItem, "interactionType", interactionType);
        ReflectionTestUtils.setField(catalogItem, "tradeable", tradeable);
        return catalogItem;
    }
}

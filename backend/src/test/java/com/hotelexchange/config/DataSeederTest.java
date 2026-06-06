package com.hotelexchange.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.hotelexchange.furniture.FurnitureCatalogEntity;
import com.hotelexchange.furniture.FurnitureCatalogRepository;
import com.hotelexchange.inventory.UserInventoryEntity;
import com.hotelexchange.inventory.UserInventoryRepository;
import com.hotelexchange.user.UserEntity;
import com.hotelexchange.user.UserRepository;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class DataSeederTest {

    @Mock
    private FurnitureCatalogRepository furnitureCatalogRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserInventoryRepository userInventoryRepository;

    @Mock
    private UserRepository userRepository;

    private DataSeeder dataSeeder;

    @BeforeEach
    void setUp() {
        dataSeeder = new DataSeeder(
                new AppProperties(),
                furnitureCatalogRepository,
                passwordEncoder,
                userInventoryRepository,
                userRepository
        );
    }

    @Test
    void seedsTraderAndBrokerInitialFurnitureInventory() {
        UserEntity trader = user(1L, "trader");
        UserEntity broker = user(2L, "broker");
        FurnitureCatalogEntity sofa = catalog(10L, "green_leather_sofa");
        FurnitureCatalogEntity table = catalog(20L, "dark_wood_coffee_table");
        FurnitureCatalogEntity chair = catalog(30L, "red_executive_chair");

        when(userRepository.findByUsername("trader")).thenReturn(Optional.of(trader));
        when(userRepository.findByUsername("broker")).thenReturn(Optional.of(broker));
        when(furnitureCatalogRepository.findByCode("green_leather_sofa")).thenReturn(Optional.of(sofa));
        when(furnitureCatalogRepository.findByCode("dark_wood_coffee_table")).thenReturn(Optional.of(table));
        when(furnitureCatalogRepository.findByCode("red_executive_chair")).thenReturn(Optional.of(chair));
        when(userInventoryRepository.existsByUser_IdAndCatalogItem_Id(1L, 10L)).thenReturn(false);
        when(userInventoryRepository.existsByUser_IdAndCatalogItem_Id(1L, 20L)).thenReturn(false);
        when(userInventoryRepository.existsByUser_IdAndCatalogItem_Id(1L, 30L)).thenReturn(false);
        when(userInventoryRepository.existsByUser_IdAndCatalogItem_Id(2L, 20L)).thenReturn(false);
        when(userInventoryRepository.existsByUser_IdAndCatalogItem_Id(2L, 30L)).thenReturn(false);

        dataSeeder.run();

        ArgumentCaptor<UserInventoryEntity> captor = ArgumentCaptor.forClass(UserInventoryEntity.class);
        org.mockito.Mockito.verify(userInventoryRepository, org.mockito.Mockito.times(5)).save(captor.capture());

        assertThat(captor.getAllValues())
                .extracting(
                        item -> item.getUser().getUsername(),
                        item -> item.getCatalogItem().getCode(),
                        UserInventoryEntity::getQuantity,
                        UserInventoryEntity::getSource
                )
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("trader", "green_leather_sofa", 1, "SEED"),
                        org.assertj.core.groups.Tuple.tuple("trader", "dark_wood_coffee_table", 1, "SEED"),
                        org.assertj.core.groups.Tuple.tuple("trader", "red_executive_chair", 1, "SEED"),
                        org.assertj.core.groups.Tuple.tuple("broker", "dark_wood_coffee_table", 1, "SEED"),
                        org.assertj.core.groups.Tuple.tuple("broker", "red_executive_chair", 1, "SEED")
                );
    }

    private UserEntity user(Long id, String username) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "id", id);
        user.setUsername(username);
        user.setDisplayName(username);
        user.setPasswordHash("hash");
        return user;
    }

    private FurnitureCatalogEntity catalog(Long id, String code) {
        FurnitureCatalogEntity catalogItem = new FurnitureCatalogEntity();
        ReflectionTestUtils.setField(catalogItem, "id", id);
        ReflectionTestUtils.setField(catalogItem, "code", code);
        ReflectionTestUtils.setField(catalogItem, "name", code);
        ReflectionTestUtils.setField(catalogItem, "type", "FLOOR");
        ReflectionTestUtils.setField(catalogItem, "spriteKey", "furniture_" + code);
        ReflectionTestUtils.setField(catalogItem, "spritePath", "/assets/furniture/" + code + ".png");
        ReflectionTestUtils.setField(catalogItem, "width", 1);
        ReflectionTestUtils.setField(catalogItem, "height", 1);
        ReflectionTestUtils.setField(catalogItem, "blocksMovement", true);
        ReflectionTestUtils.setField(catalogItem, "canSit", false);
        ReflectionTestUtils.setField(catalogItem, "canWalk", false);
        ReflectionTestUtils.setField(catalogItem, "canStack", false);
        ReflectionTestUtils.setField(catalogItem, "defaultZ", BigDecimal.ZERO);
        ReflectionTestUtils.setField(catalogItem, "interactionType", "NONE");
        ReflectionTestUtils.setField(catalogItem, "tradeable", false);
        return catalogItem;
    }
}

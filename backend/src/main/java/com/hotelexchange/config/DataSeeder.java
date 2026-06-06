package com.hotelexchange.config;

import com.hotelexchange.furniture.FurnitureCatalogEntity;
import com.hotelexchange.furniture.FurnitureCatalogRepository;
import com.hotelexchange.inventory.UserInventoryEntity;
import com.hotelexchange.inventory.UserInventoryRepository;
import com.hotelexchange.user.UserEntity;
import com.hotelexchange.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements CommandLineRunner {

    private final AppProperties properties;
    private final FurnitureCatalogRepository furnitureCatalogRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserInventoryRepository userInventoryRepository;
    private final UserRepository userRepository;

    public DataSeeder(
            AppProperties properties,
            FurnitureCatalogRepository furnitureCatalogRepository,
            PasswordEncoder passwordEncoder,
            UserInventoryRepository userInventoryRepository,
            UserRepository userRepository
    ) {
        this.properties = properties;
        this.furnitureCatalogRepository = furnitureCatalogRepository;
        this.passwordEncoder = passwordEncoder;
        this.userInventoryRepository = userInventoryRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        UserEntity firstUser = seedUser(properties.getSeed().getTestUsername(), properties.getSeed().getTestPassword());
        UserEntity secondUser = seedUser(properties.getSeed().getSecondTestUsername(), properties.getSeed().getSecondTestPassword());

        seedInventory(firstUser, "green_leather_sofa", "dark_wood_coffee_table", "red_executive_chair");
        seedInventory(secondUser, "dark_wood_coffee_table", "red_executive_chair");
    }

    private UserEntity seedUser(String rawUsername, String rawPassword) {
        String username = rawUsername.trim();
        return userRepository.findByUsername(username).orElseGet(() -> {
            UserEntity user = new UserEntity();
            user.setUsername(username);
            user.setDisplayName(username);
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
            return userRepository.save(user);
        });
    }

    private void seedInventory(UserEntity user, String... catalogCodes) {
        for (String catalogCode : catalogCodes) {
            furnitureCatalogRepository.findByCode(catalogCode)
                    .ifPresent(catalogItem -> seedInventoryItem(user, catalogItem));
        }
    }

    private void seedInventoryItem(UserEntity user, FurnitureCatalogEntity catalogItem) {
        if (userInventoryRepository.existsByUser_IdAndCatalogItem_Id(user.getId(), catalogItem.getId())) {
            return;
        }

        userInventoryRepository.save(new UserInventoryEntity(user, catalogItem, 1, "SEED"));
    }
}

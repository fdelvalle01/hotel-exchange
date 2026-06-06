package com.hotelexchange.furniture;

import com.hotelexchange.error.FurniturePlacementException;
import com.hotelexchange.error.NotFoundException;
import com.hotelexchange.inventory.InventoryItemDto;
import com.hotelexchange.inventory.UserInventoryEntity;
import com.hotelexchange.inventory.UserInventoryRepository;
import com.hotelexchange.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FurnitureRemovalService {

    private final RoomFurnitureRepository roomFurnitureRepository;
    private final UserInventoryRepository userInventoryRepository;
    private final UserRepository userRepository;

    public FurnitureRemovalService(
            RoomFurnitureRepository roomFurnitureRepository,
            UserInventoryRepository userInventoryRepository,
            UserRepository userRepository
    ) {
        this.roomFurnitureRepository = roomFurnitureRepository;
        this.userInventoryRepository = userInventoryRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public RemoveFurnitureResponse removeFurniture(Long userId, Long roomId, Long roomFurnitureId) {
        RoomFurnitureEntity furniture = roomFurnitureRepository
                .findByIdAndRoom_Id(roomFurnitureId, roomId)
                .orElseThrow(() -> new NotFoundException("Furniture not found in this room"));

        Long ownerUserId = furniture.getOwnerUser() != null ? furniture.getOwnerUser().getId() : null;

        if (ownerUserId == null) {
            throw new FurniturePlacementException("Cannot remove system furniture");
        }

        if (!ownerUserId.equals(userId)) {
            throw new FurniturePlacementException("You do not own this furniture");
        }

        FurnitureCatalogEntity catalogItem = furniture.getCatalogItem();
        String catalogCode = catalogItem.getCode();
        Long catalogItemId = catalogItem.getId();

        roomFurnitureRepository.delete(furniture);

        UserInventoryEntity inventoryItem = userInventoryRepository
                .findInventoryItemForUserAndCatalog(userId, catalogItemId)
                .orElseGet(() -> new UserInventoryEntity(
                        userRepository.getReferenceById(userId), catalogItem, 0, "PLACED_RETURN"));
        inventoryItem.setQuantity(inventoryItem.getQuantity() + 1);
        UserInventoryEntity saved = userInventoryRepository.save(inventoryItem);

        return new RemoveFurnitureResponse(roomFurnitureId, catalogCode, InventoryItemDto.from(saved));
    }
}

package com.hotelexchange.furniture;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelexchange.error.FurniturePlacementException;
import com.hotelexchange.inventory.InventoryItemDto;
import com.hotelexchange.inventory.UserInventoryEntity;
import com.hotelexchange.inventory.UserInventoryRepository;
import com.hotelexchange.realtime.GridPosition;
import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomLayoutService;
import com.hotelexchange.user.UserRepository;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FurniturePlacementService {

    private final FurnitureCatalogRepository furnitureCatalogRepository;
    private final RoomFurnitureRepository roomFurnitureRepository;
    private final UserInventoryRepository userInventoryRepository;
    private final UserRepository userRepository;
    private final RoomLayoutService roomLayoutService;
    private final RoomFurnitureService roomFurnitureService;
    private final ObjectMapper objectMapper;

    public FurniturePlacementService(
            FurnitureCatalogRepository furnitureCatalogRepository,
            RoomFurnitureRepository roomFurnitureRepository,
            UserInventoryRepository userInventoryRepository,
            UserRepository userRepository,
            RoomLayoutService roomLayoutService,
            RoomFurnitureService roomFurnitureService,
            ObjectMapper objectMapper
    ) {
        this.furnitureCatalogRepository = furnitureCatalogRepository;
        this.roomFurnitureRepository = roomFurnitureRepository;
        this.userInventoryRepository = userInventoryRepository;
        this.userRepository = userRepository;
        this.roomLayoutService = roomLayoutService;
        this.roomFurnitureService = roomFurnitureService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PlaceFurnitureResponse placeFurniture(Long userId, RoomEntity room, PlaceFurnitureRequest request) {
        FurnitureCatalogEntity catalogItem = furnitureCatalogRepository.findByCode(request.catalogCode())
                .orElseThrow(() -> new FurniturePlacementException("Furniture not found: " + request.catalogCode()));

        UserInventoryEntity inventoryItem = userInventoryRepository
                .findInventoryItemForUserAndCatalog(userId, catalogItem.getId())
                .orElseThrow(() -> new FurniturePlacementException("Item not in inventory"));

        if (inventoryItem.getQuantity() <= 0) {
            throw new FurniturePlacementException("No remaining inventory for this item");
        }

        String rotation = resolveRotation(request.rotation());
        int footprintWidth = swapsFootprint(rotation) ? catalogItem.getHeight() : catalogItem.getWidth();
        int footprintHeight = swapsFootprint(rotation) ? catalogItem.getWidth() : catalogItem.getHeight();

        Set<GridPosition> furnitureBlockedTiles = roomFurnitureService.blockedTileSet(room);

        for (int dy = 0; dy < footprintHeight; dy++) {
            for (int dx = 0; dx < footprintWidth; dx++) {
                int tileX = request.x() + dx;
                int tileY = request.y() + dy;
                GridPosition tilePos = new GridPosition(tileX, tileY);

                if (!roomLayoutService.tileExists(room, tileX, tileY)) {
                    throw new FurniturePlacementException(
                            "Tile (%d, %d) does not exist".formatted(tileX, tileY));
                }
                if (!roomLayoutService.isStructurallyWalkable(room, tileX, tileY)) {
                    throw new FurniturePlacementException(
                            "Tile (%d, %d) is not walkable".formatted(tileX, tileY));
                }
                if (furnitureBlockedTiles.contains(tilePos)) {
                    throw new FurniturePlacementException(
                            "Tile (%d, %d) is occupied by furniture".formatted(tileX, tileY));
                }
            }
        }

        RoomFurnitureEntity furniture = new RoomFurnitureEntity(
                room,
                catalogItem,
                userRepository.getReferenceById(userId),
                request.x(),
                request.y(),
                catalogItem.getDefaultZ(),
                rotation
        );
        RoomFurnitureEntity saved = roomFurnitureRepository.save(furniture);

        inventoryItem.setQuantity(inventoryItem.getQuantity() - 1);
        UserInventoryEntity updatedInventory = userInventoryRepository.save(inventoryItem);

        RoomFurnitureDto furnitureDto = RoomFurnitureDto.from(saved, objectMapper.createObjectNode());
        InventoryItemDto inventoryDto = InventoryItemDto.from(updatedInventory);
        return new PlaceFurnitureResponse(furnitureDto, inventoryDto);
    }

    private String resolveRotation(String rotation) {
        if (rotation == null || rotation.isBlank()) {
            return "SE";
        }
        String normalized = rotation.trim().toUpperCase();
        return switch (normalized) {
            case "NE", "NW", "SW" -> normalized;
            default -> "SE";
        };
    }

    private boolean swapsFootprint(String rotation) {
        return rotation.equals("NE") || rotation.equals("SW");
    }
}

package com.hotelexchange.furniture;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelexchange.error.FurniturePlacementException;
import com.hotelexchange.error.NotFoundException;
import com.hotelexchange.realtime.GridPosition;
import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomLayoutService;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FurnitureRotationService {

    private final RoomFurnitureRepository roomFurnitureRepository;
    private final RoomFurnitureService roomFurnitureService;
    private final RoomLayoutService roomLayoutService;
    private final ObjectMapper objectMapper;

    public FurnitureRotationService(
            RoomFurnitureRepository roomFurnitureRepository,
            RoomFurnitureService roomFurnitureService,
            RoomLayoutService roomLayoutService,
            ObjectMapper objectMapper
    ) {
        this.roomFurnitureRepository = roomFurnitureRepository;
        this.roomFurnitureService = roomFurnitureService;
        this.roomLayoutService = roomLayoutService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public RotateFurnitureResponse rotateFurniture(
            Long userId, RoomEntity room, Long roomFurnitureId, RotateFurnitureRequest request
    ) {
        RoomFurnitureEntity furniture = roomFurnitureRepository
                .findByIdAndRoom_Id(roomFurnitureId, room.getId())
                .orElseThrow(() -> new NotFoundException("Furniture not found in this room"));

        Long ownerUserId = furniture.getOwnerUser() != null ? furniture.getOwnerUser().getId() : null;
        if (ownerUserId == null) {
            throw new FurniturePlacementException("System furniture cannot be rotated");
        }
        if (!ownerUserId.equals(userId)) {
            throw new FurniturePlacementException("You can only rotate your own furniture");
        }

        String newRotation = resolveRotation(request.rotation());

        if (newRotation.equals(furniture.getRotation())) {
            return new RotateFurnitureResponse(RoomFurnitureDto.from(furniture, objectMapper.createObjectNode()));
        }

        FurnitureCatalogEntity catalogItem = furniture.getCatalogItem();
        int newWidth = swapsFootprint(newRotation) ? catalogItem.getHeight() : catalogItem.getWidth();
        int newHeight = swapsFootprint(newRotation) ? catalogItem.getWidth() : catalogItem.getHeight();

        Set<GridPosition> blockedByOthers = roomFurnitureService.blockedTileSetExcluding(room, roomFurnitureId);

        for (int dy = 0; dy < newHeight; dy++) {
            for (int dx = 0; dx < newWidth; dx++) {
                int tileX = furniture.getX() + dx;
                int tileY = furniture.getY() + dy;
                GridPosition pos = new GridPosition(tileX, tileY);

                if (!roomLayoutService.tileExists(room, tileX, tileY)) {
                    throw new FurniturePlacementException(
                            "Rotated footprint exceeds room at tile (%d, %d)".formatted(tileX, tileY));
                }
                if (!roomLayoutService.isStructurallyWalkable(room, tileX, tileY)) {
                    throw new FurniturePlacementException(
                            "Rotated footprint is structurally blocked at tile (%d, %d)".formatted(tileX, tileY));
                }
                if (blockedByOthers.contains(pos)) {
                    throw new FurniturePlacementException(
                            "Rotated footprint collides with furniture at tile (%d, %d)".formatted(tileX, tileY));
                }
            }
        }

        furniture.setRotation(newRotation);
        RoomFurnitureEntity saved = roomFurnitureRepository.save(furniture);

        return new RotateFurnitureResponse(RoomFurnitureDto.from(saved, objectMapper.createObjectNode()));
    }

    private String resolveRotation(String rotation) {
        if (rotation == null || rotation.isBlank()) {
            throw new FurniturePlacementException("Rotation must not be blank");
        }
        return switch (rotation.trim().toUpperCase()) {
            case "NE", "NW", "SW", "SE" -> rotation.trim().toUpperCase();
            default -> throw new FurniturePlacementException("Invalid rotation value: " + rotation);
        };
    }

    private boolean swapsFootprint(String rotation) {
        return rotation.equals("NE") || rotation.equals("SW");
    }
}

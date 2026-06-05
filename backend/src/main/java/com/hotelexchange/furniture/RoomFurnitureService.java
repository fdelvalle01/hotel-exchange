package com.hotelexchange.furniture;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelexchange.realtime.GridPosition;
import com.hotelexchange.room.RoomEntity;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomFurnitureService {

    private final ObjectMapper objectMapper;
    private final RoomFurnitureRepository roomFurnitureRepository;

    public RoomFurnitureService(
            ObjectMapper objectMapper,
            RoomFurnitureRepository roomFurnitureRepository
    ) {
        this.objectMapper = objectMapper;
        this.roomFurnitureRepository = roomFurnitureRepository;
    }

    @Transactional(readOnly = true)
    public List<RoomFurnitureDto> furnitureForRoom(RoomEntity room) {
        return roomFurnitureRepository.findByRoom_IdOrderByIdAsc(room.getId()).stream()
                .map(entity -> RoomFurnitureDto.from(entity, parseState(entity.getState())))
                .toList();
    }

    @Transactional(readOnly = true)
    public Set<GridPosition> blockedTileSet(RoomEntity room) {
        Set<GridPosition> blockedTiles = new LinkedHashSet<>();
        for (RoomFurnitureEntity furniture : roomFurnitureRepository.findByRoom_IdOrderByIdAsc(room.getId())) {
            blockedTiles.addAll(blockedTilesForFurniture(room, furniture));
        }
        return Set.copyOf(blockedTiles);
    }

    @Transactional(readOnly = true)
    public List<BlockedTileDto> blockedTiles(RoomEntity room) {
        return blockedTileSet(room).stream()
                .sorted(Comparator.comparingInt(GridPosition::y).thenComparingInt(GridPosition::x))
                .map(BlockedTileDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isFurnitureBlockedTile(RoomEntity room, GridPosition position) {
        return blockedTileSet(room).contains(position);
    }

    private List<GridPosition> blockedTilesForFurniture(RoomEntity room, RoomFurnitureEntity furniture) {
        FurnitureCatalogEntity catalogItem = furniture.getCatalogItem();
        if (!catalogItem.isBlocksMovement() || catalogItem.isCanWalk()) {
            return List.of();
        }

        int footprintWidth = rotatedWidth(catalogItem, furniture.getRotation());
        int footprintHeight = rotatedHeight(catalogItem, furniture.getRotation());
        Set<GridPosition> affectedTiles = new LinkedHashSet<>();

        for (int offsetY = 0; offsetY < footprintHeight; offsetY += 1) {
            for (int offsetX = 0; offsetX < footprintWidth; offsetX += 1) {
                GridPosition position = new GridPosition(
                        furniture.getX() + offsetX,
                        furniture.getY() + offsetY
                );
                if (isInsideRoom(room, position)) {
                    affectedTiles.add(position);
                }
            }
        }

        return affectedTiles.stream()
                .sorted(Comparator.comparingInt(GridPosition::y).thenComparingInt(GridPosition::x))
                .toList();
    }

    private int rotatedWidth(FurnitureCatalogEntity catalogItem, String rotation) {
        return swapsFootprint(rotation) ? catalogItem.getHeight() : catalogItem.getWidth();
    }

    private int rotatedHeight(FurnitureCatalogEntity catalogItem, String rotation) {
        return swapsFootprint(rotation) ? catalogItem.getWidth() : catalogItem.getHeight();
    }

    private boolean swapsFootprint(String rotation) {
        if (rotation == null) {
            return false;
        }
        String normalized = rotation.trim().toUpperCase();
        return normalized.equals("NE") || normalized.equals("SW");
    }

    private boolean isInsideRoom(RoomEntity room, GridPosition position) {
        return position.x() >= 0
                && position.y() >= 0
                && position.x() < room.getWidth()
                && position.y() < room.getHeight();
    }

    private JsonNode parseState(String state) {
        if (state == null || state.isBlank()) {
            return objectMapper.createObjectNode();
        }

        try {
            return objectMapper.readTree(state);
        } catch (Exception exception) {
            return objectMapper.createObjectNode();
        }
    }
}

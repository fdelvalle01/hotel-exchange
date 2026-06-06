package com.hotelexchange.room;

import com.hotelexchange.error.BadRoomEventException;
import com.hotelexchange.furniture.BlockedTileDto;
import com.hotelexchange.furniture.RoomFurnitureService;
import com.hotelexchange.realtime.GridPosition;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomLayoutService {

    private static final String STRUCTURAL_REASON = "STRUCTURAL";
    private static final String FURNITURE_REASON = "FURNITURE";
    private static final String LEGACY_BLOCKER_REASON = "LEGACY_BLOCKER";

    private final RoomBlockedTileRepository blockedTileRepository;
    private final RoomModelService roomModelService;
    private final RoomFurnitureService roomFurnitureService;

    public RoomLayoutService(
            RoomBlockedTileRepository blockedTileRepository,
            RoomModelService roomModelService,
            RoomFurnitureService roomFurnitureService
    ) {
        this.blockedTileRepository = blockedTileRepository;
        this.roomModelService = roomModelService;
        this.roomFurnitureService = roomFurnitureService;
    }

    @Transactional(readOnly = true)
    public List<GridPosition> blockedTiles(RoomEntity room) {
        return blockedTileReasons(room).keySet().stream().toList();
    }

    @Transactional(readOnly = true)
    public Set<GridPosition> blockedTileSet(RoomEntity room) {
        return blockedTiles(room).stream().collect(Collectors.toUnmodifiableSet());
    }

    @Transactional(readOnly = true)
    public List<BlockedTileDto> blockedTileDtos(RoomEntity room) {
        return blockedTileReasons(room).entrySet().stream()
                .map(e -> new BlockedTileDto(e.getKey().x(), e.getKey().y(), e.getValue()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Set<GridPosition> walkableTileSet(RoomEntity room, Set<GridPosition> blockedTiles) {
        Set<GridPosition> walkableTiles = new LinkedHashSet<>(structurallyWalkableTileSet(room));
        walkableTiles.removeAll(blockedTiles);
        return Set.copyOf(walkableTiles);
    }

    public void validateWalkableDestination(RoomEntity room, GridPosition position, Set<GridPosition> blockedTiles) {
        if (!isInsideRoom(room, position)) {
            throw new BadRoomEventException("Movement outside room grid");
        }
        if (!tileExists(room, position.x(), position.y())) {
            throw new BadRoomEventException("Tile does not exist");
        }
        if (!isStructurallyWalkable(room, position.x(), position.y())) {
            throw new BadRoomEventException("Tile is structurally blocked");
        }
        if (isLegacyBlocked(room, position.x(), position.y())) {
            throw new BadRoomEventException("Tile is structurally blocked");
        }
        if (blockedTiles.contains(position)) {
            if (isFurnitureBlocked(room, position.x(), position.y())) {
                throw new BadRoomEventException("Destination tile is blocked by furniture");
            }
            throw new BadRoomEventException("Destination tile is blocked");
        }
    }

    public boolean tileExists(RoomEntity room, int x, int y) {
        GridPosition position = new GridPosition(x, y);
        if (!isInsideRoom(room, position)) {
            return false;
        }
        return roomModel(room)
                .map(model -> existingTileSet(model).contains(position))
                .orElse(true);
    }

    public boolean isStructurallyWalkable(RoomEntity room, int x, int y) {
        GridPosition position = new GridPosition(x, y);
        if (!isInsideRoom(room, position)) {
            return false;
        }
        return roomModel(room)
                .map(model -> walkableTileSet(model).contains(position))
                .orElse(true);
    }

    public boolean isStructurallyBlocked(RoomEntity room, int x, int y) {
        return tileExists(room, x, y) && !isStructurallyWalkable(room, x, y);
    }

    public boolean isFurnitureBlocked(RoomEntity room, int x, int y) {
        return roomFurnitureService.isFurnitureBlockedTile(room, new GridPosition(x, y));
    }

    public GridPosition spawnPosition(RoomEntity room) {
        return roomModel(room)
                .map(model -> new GridPosition(model.getSpawnX(), model.getSpawnY()))
                .orElseGet(() -> new GridPosition(room.getSpawnX(), room.getSpawnY()));
    }

    public String spawnDirection(RoomEntity room) {
        return roomModel(room)
                .map(RoomModelEntity::getSpawnDirection)
                .orElse(null);
    }

    public boolean isInsideRoom(RoomEntity room, GridPosition position) {
        return position.x() >= 0
                && position.y() >= 0
                && position.x() < room.getWidth()
                && position.y() < room.getHeight();
    }

    public boolean isWalkable(RoomEntity room, GridPosition position, Set<GridPosition> blockedTiles) {
        return isInsideRoom(room, position)
                && tileExists(room, position.x(), position.y())
                && isStructurallyWalkable(room, position.x(), position.y())
                && !blockedTiles.contains(position);
    }

    private Map<GridPosition, String> blockedTileReasons(RoomEntity room) {
        Map<GridPosition, String> reasons = new LinkedHashMap<>();

        structuralBlockedTileSet(room)
                .forEach(position -> reasons.put(position, STRUCTURAL_REASON));

        legacyBlockedTileSet(room)
                .forEach(position -> reasons.putIfAbsent(position, LEGACY_BLOCKER_REASON));

        roomFurnitureService.blockedTileSet(room).stream()
                .filter(position -> tileExists(room, position.x(), position.y()))
                .forEach(position -> reasons.putIfAbsent(position, FURNITURE_REASON));

        return reasons.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(
                        Comparator.comparingInt(GridPosition::y).thenComparingInt(GridPosition::x)))
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private Set<GridPosition> structurallyWalkableTileSet(RoomEntity room) {
        return roomModel(room)
                .map(this::walkableTileSet)
                .orElseGet(() -> rectangularTileSet(room));
    }

    private Set<GridPosition> structuralBlockedTileSet(RoomEntity room) {
        return roomModel(room)
                .map(this::structuralBlockedTileSet)
                .orElseGet(Set::of);
    }

    private Set<GridPosition> legacyBlockedTileSet(RoomEntity room) {
        return blockedTileRepository.findByRoom_Id(room.getId()).stream()
                .map(tile -> new GridPosition(tile.getX(), tile.getY()))
                .filter(position -> isInsideRoom(room, position))
                .filter(position -> tileExists(room, position.x(), position.y()))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private boolean isLegacyBlocked(RoomEntity room, int x, int y) {
        return legacyBlockedTileSet(room).contains(new GridPosition(x, y));
    }

    private Set<GridPosition> rectangularTileSet(RoomEntity room) {
        Set<GridPosition> result = new LinkedHashSet<>();
        for (int y = 0; y < room.getHeight(); y += 1) {
            for (int x = 0; x < room.getWidth(); x += 1) {
                result.add(new GridPosition(x, y));
            }
        }
        return result;
    }

    private Optional<RoomModelEntity> roomModel(RoomEntity room) {
        if (room.getModelCode() == null || room.getModelCode().isBlank()) {
            return Optional.empty();
        }

        return Optional.of(roomModelService.getModelForRoom(room)
                .orElseThrow(() -> new BadRoomEventException("Room model unavailable")));
    }

    private Set<GridPosition> existingTileSet(RoomModelEntity model) {
        try {
            return roomModelService.existingTileSet(model);
        } catch (RoomModelService.InvalidFloorMapException exception) {
            throw new BadRoomEventException("Room model is invalid");
        }
    }

    private Set<GridPosition> walkableTileSet(RoomModelEntity model) {
        try {
            return roomModelService.walkableTileSet(model);
        } catch (RoomModelService.InvalidFloorMapException exception) {
            throw new BadRoomEventException("Room model is invalid");
        }
    }

    private Set<GridPosition> structuralBlockedTileSet(RoomModelEntity model) {
        try {
            return roomModelService.structuralBlockedTileSet(model);
        } catch (RoomModelService.InvalidFloorMapException exception) {
            throw new BadRoomEventException("Room model is invalid");
        }
    }
}

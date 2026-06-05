package com.hotelexchange.room;

import com.hotelexchange.error.BadRoomEventException;
import com.hotelexchange.furniture.BlockedTileDto;
import com.hotelexchange.furniture.RoomFurnitureService;
import com.hotelexchange.realtime.GridPosition;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomLayoutService {

    private final RoomBlockedTileRepository blockedTileRepository;
    private final RoomFurnitureService roomFurnitureService;

    public RoomLayoutService(
            RoomBlockedTileRepository blockedTileRepository,
            RoomFurnitureService roomFurnitureService
    ) {
        this.blockedTileRepository = blockedTileRepository;
        this.roomFurnitureService = roomFurnitureService;
    }

    @Transactional(readOnly = true)
    public List<GridPosition> blockedTiles(RoomEntity room) {
        Set<GridPosition> blockedTiles = new LinkedHashSet<>();
        blockedTileRepository.findByRoom_Id(room.getId()).stream()
                .map(tile -> new GridPosition(tile.getX(), tile.getY()))
                .forEach(blockedTiles::add);
        blockedTiles.addAll(roomFurnitureService.blockedTileSet(room));

        return blockedTiles.stream()
                .sorted(Comparator.comparingInt(GridPosition::y).thenComparingInt(GridPosition::x))
                .toList();
    }

    @Transactional(readOnly = true)
    public Set<GridPosition> blockedTileSet(RoomEntity room) {
        return blockedTiles(room).stream().collect(Collectors.toUnmodifiableSet());
    }

    @Transactional(readOnly = true)
    public List<BlockedTileDto> blockedTileDtos(RoomEntity room) {
        return blockedTiles(room).stream()
                .map(BlockedTileDto::from)
                .toList();
    }

    public void validateWalkableDestination(RoomEntity room, GridPosition position, Set<GridPosition> blockedTiles) {
        if (!isInsideRoom(room, position)) {
            throw new BadRoomEventException("Movement outside room grid");
        }
        if (blockedTiles.contains(position)) {
            if (roomFurnitureService.isFurnitureBlockedTile(room, position)) {
                throw new BadRoomEventException("Destination tile is blocked by furniture");
            }
            throw new BadRoomEventException("Destination tile is blocked");
        }
    }

    public boolean isInsideRoom(RoomEntity room, GridPosition position) {
        return position.x() >= 0
                && position.y() >= 0
                && position.x() < room.getWidth()
                && position.y() < room.getHeight();
    }

    public boolean isWalkable(RoomEntity room, GridPosition position, Set<GridPosition> blockedTiles) {
        return isInsideRoom(room, position) && !blockedTiles.contains(position);
    }
}

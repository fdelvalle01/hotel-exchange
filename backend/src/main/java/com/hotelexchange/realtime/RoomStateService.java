package com.hotelexchange.realtime;

import com.hotelexchange.error.BadRoomEventException;
import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomLayoutService;
import com.hotelexchange.room.UserRoomStateEntity;
import com.hotelexchange.room.UserRoomStateRepository;
import com.hotelexchange.user.UserEntity;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomStateService {

    private static final String DEFAULT_DIRECTION = "south";
    private static final Set<String> ALLOWED_DIRECTIONS = Set.of(
            "north",
            "north_east",
            "east",
            "south_east",
            "south",
            "south_west",
            "west",
            "north_west"
    );

    private final UserRoomStateRepository userRoomStateRepository;
    private final RoomLayoutService roomLayoutService;
    private final PathfindingService pathfindingService;

    public RoomStateService(
            UserRoomStateRepository userRoomStateRepository,
            RoomLayoutService roomLayoutService,
            PathfindingService pathfindingService
    ) {
        this.userRoomStateRepository = userRoomStateRepository;
        this.roomLayoutService = roomLayoutService;
        this.pathfindingService = pathfindingService;
    }

    @Transactional
    public RoomStateSnapshot resolveJoinState(RoomEntity room, UserEntity user) {
        Set<GridPosition> blockedTiles = roomLayoutService.blockedTileSet(room);
        return userRoomStateRepository.findByRoom_IdAndUser_Id(room.getId(), user.getId())
                .filter(state -> roomLayoutService.isWalkable(room, new GridPosition(state.getX(), state.getY()), blockedTiles))
                .map(state -> new RoomStateSnapshot(
                        new GridPosition(state.getX(), state.getY()),
                        sanitizeDirection(state.getDirection())
                ))
                .orElseGet(() -> saveState(
                        room,
                        user,
                        defaultPosition(room, blockedTiles),
                        sanitizeDirection(roomLayoutService.spawnDirection(room))
                ));
    }

    @Transactional
    public MovementResult persistMovement(RoomEntity room, UserEntity user, GridPosition start, MovePayload payload) {
        GridPosition destination = new GridPosition(payload.x(), payload.y());
        Set<GridPosition> blockedTiles = roomLayoutService.blockedTileSet(room);
        roomLayoutService.validateWalkableDestination(room, destination, blockedTiles);

        List<GridPosition> path = pathfindingService.findPath(room, start, destination, blockedTiles);
        if (!start.equals(destination) && path.isEmpty()) {
            throw new BadRoomEventException("No path to destination");
        }

        String direction = directionFor(start, path);
        RoomStateSnapshot snapshot = saveState(
                room,
                user,
                destination,
                direction
        );
        return new MovementResult(snapshot.position(), snapshot.direction(), path);
    }

    public void validatePosition(RoomEntity room, int x, int y) {
        Set<GridPosition> blockedTiles = roomLayoutService.blockedTileSet(room);
        roomLayoutService.validateWalkableDestination(room, new GridPosition(x, y), blockedTiles);
    }

    private RoomStateSnapshot saveState(RoomEntity room, UserEntity user, GridPosition position, String direction) {
        UserRoomStateEntity state = userRoomStateRepository
                .findByRoom_IdAndUser_Id(room.getId(), user.getId())
                .orElseGet(() -> new UserRoomStateEntity(room, user));

        state.setX(position.x());
        state.setY(position.y());
        state.setDirection(direction);
        userRoomStateRepository.save(state);
        return new RoomStateSnapshot(position, direction);
    }

    private GridPosition defaultPosition(RoomEntity room, Set<GridPosition> blockedTiles) {
        GridPosition spawn = roomLayoutService.spawnPosition(room);
        Set<GridPosition> walkableTiles = roomLayoutService.walkableTileSet(room, blockedTiles);
        if (walkableTiles.contains(spawn)) {
            return spawn;
        }

        for (int y = 0; y < room.getHeight(); y += 1) {
            for (int x = 0; x < room.getWidth(); x += 1) {
                GridPosition candidate = new GridPosition(x, y);
                if (walkableTiles.contains(candidate)) {
                    return candidate;
                }
            }
        }
        throw new BadRoomEventException("Room has no walkable spawn tile");
    }

    private String sanitizeDirection(String direction) {
        if (direction == null || direction.isBlank()) {
            return DEFAULT_DIRECTION;
        }

        String normalized = direction.trim().toLowerCase();
        if (!ALLOWED_DIRECTIONS.contains(normalized)) {
            return DEFAULT_DIRECTION;
        }
        return normalized;
    }

    private String directionFor(GridPosition start, List<GridPosition> path) {
        if (path.isEmpty()) {
            return DEFAULT_DIRECTION;
        }
        GridPosition next = path.get(path.size() - 1);
        GridPosition previous = path.size() >= 2 ? path.get(path.size() - 2) : start;
        int dx = Integer.compare(next.x() - previous.x(), 0);
        int dy = Integer.compare(next.y() - previous.y(), 0);

        if (dx > 0) {
            return "south_east";
        }
        if (dx < 0) {
            return "north_west";
        }
        if (dy > 0) {
            return "south_west";
        }
        if (dy < 0) {
            return "north_east";
        }
        return DEFAULT_DIRECTION;
    }
}

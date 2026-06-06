package com.hotelexchange.realtime;

import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomLayoutService;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class PathfindingService {

    private static final List<GridPosition> DIRECTIONS = List.of(
            new GridPosition(1, 0),
            new GridPosition(0, 1),
            new GridPosition(-1, 0),
            new GridPosition(0, -1)
    );

    private final RoomLayoutService roomLayoutService;

    public PathfindingService(RoomLayoutService roomLayoutService) {
        this.roomLayoutService = roomLayoutService;
    }

    public List<GridPosition> findPath(
            RoomEntity room,
            GridPosition start,
            GridPosition destination,
            Set<GridPosition> blockedTiles
    ) {
        if (start.equals(destination)) {
            return List.of();
        }

        Set<GridPosition> walkableTiles = roomLayoutService.walkableTileSet(room, blockedTiles);
        Queue<GridPosition> frontier = new ArrayDeque<>();
        Map<GridPosition, GridPosition> cameFrom = new HashMap<>();
        frontier.add(start);
        cameFrom.put(start, null);

        while (!frontier.isEmpty()) {
            GridPosition current = frontier.remove();
            if (current.equals(destination)) {
                return reconstructPath(cameFrom, destination);
            }

            for (GridPosition direction : DIRECTIONS) {
                GridPosition next = new GridPosition(current.x() + direction.x(), current.y() + direction.y());
                if (cameFrom.containsKey(next) || !walkableTiles.contains(next)) {
                    continue;
                }
                frontier.add(next);
                cameFrom.put(next, current);
            }
        }

        return List.of();
    }

    private List<GridPosition> reconstructPath(Map<GridPosition, GridPosition> cameFrom, GridPosition destination) {
        List<GridPosition> path = new ArrayList<>();
        GridPosition current = destination;
        while (current != null) {
            path.add(current);
            current = cameFrom.get(current);
        }
        Collections.reverse(path);
        return path.size() <= 1 ? List.of() : List.copyOf(path.subList(1, path.size()));
    }
}

package com.hotelexchange.room;

import com.hotelexchange.error.NotFoundException;
import com.hotelexchange.realtime.GridPosition;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomModelService {

    private final RoomModelRepository roomModelRepository;

    public RoomModelService(RoomModelRepository roomModelRepository) {
        this.roomModelRepository = roomModelRepository;
    }

    @Transactional(readOnly = true)
    public Optional<RoomModelEntity> findByCode(String code) {
        return roomModelRepository.findByCode(code);
    }

    @Transactional(readOnly = true)
    public Optional<RoomModelEntity> getModelForRoom(RoomEntity room) {
        if (room.getModelCode() == null) {
            return Optional.empty();
        }
        return roomModelRepository.findByCode(room.getModelCode());
    }

    public RoomTile[][] decodeFloorMap(RoomModelEntity model) {
        String[] rows = model.getFloorMap().split("\n", -1);

        if (rows.length != model.getHeight()) {
            throw new InvalidFloorMapException(
                    "FloorMap row count " + rows.length + " does not match model height " + model.getHeight()
                            + " for model '" + model.getCode() + "'"
            );
        }

        RoomTile[][] tiles = new RoomTile[model.getHeight()][model.getWidth()];

        for (int y = 0; y < rows.length; y++) {
            String row = rows[y];
            if (row.length() != model.getWidth()) {
                throw new InvalidFloorMapException(
                        "FloorMap row " + y + " has length " + row.length()
                                + " but model width is " + model.getWidth()
                                + " for model '" + model.getCode() + "'"
                );
            }
            for (int x = 0; x < row.length(); x++) {
                tiles[y][x] = parseTile(x, y, row.charAt(x), model.getCode());
            }
        }

        return tiles;
    }

    public void validateModel(RoomModelEntity model) {
        RoomTile[][] tiles = decodeFloorMap(model);

        int sx = model.getSpawnX();
        int sy = model.getSpawnY();

        if (sx < 0 || sx >= model.getWidth() || sy < 0 || sy >= model.getHeight()) {
            throw new InvalidFloorMapException(
                    "Spawn (" + sx + "," + sy + ") is outside bounds for model '" + model.getCode() + "'"
            );
        }

        RoomTile spawnTile = tiles[sy][sx];
        if (!spawnTile.exists() || !spawnTile.walkable()) {
            throw new InvalidFloorMapException(
                    "Spawn (" + sx + "," + sy + ") is not walkable for model '" + model.getCode() + "'"
            );
        }
    }

    public Set<GridPosition> existingTileSet(RoomModelEntity model) {
        RoomTile[][] tiles = decodeFloorMap(model);
        Set<GridPosition> result = new HashSet<>();
        for (RoomTile[] row : tiles) {
            for (RoomTile tile : row) {
                if (tile.exists()) {
                    result.add(new GridPosition(tile.x(), tile.y()));
                }
            }
        }
        return Set.copyOf(result);
    }

    public Set<GridPosition> walkableTileSet(RoomModelEntity model) {
        RoomTile[][] tiles = decodeFloorMap(model);
        Set<GridPosition> result = new HashSet<>();
        for (RoomTile[] row : tiles) {
            for (RoomTile tile : row) {
                if (tile.walkable()) {
                    result.add(new GridPosition(tile.x(), tile.y()));
                }
            }
        }
        return Set.copyOf(result);
    }

    public Set<GridPosition> structuralBlockedTileSet(RoomModelEntity model) {
        RoomTile[][] tiles = decodeFloorMap(model);
        Set<GridPosition> result = new HashSet<>();
        for (RoomTile[] row : tiles) {
            for (RoomTile tile : row) {
                if (tile.exists() && !tile.walkable()) {
                    result.add(new GridPosition(tile.x(), tile.y()));
                }
            }
        }
        return Set.copyOf(result);
    }

    private RoomTile parseTile(int x, int y, char c, String modelCode) {
        return switch (c) {
            case 'x', 'X' -> new RoomTile(x, y, false, false, 0);
            case '0'       -> new RoomTile(x, y, true,  true,  0);
            case 'b', 'B'  -> new RoomTile(x, y, true,  false, 0);
            default -> {
                if (c >= '1' && c <= '9') {
                    yield new RoomTile(x, y, true, true, c - '0');
                }
                throw new InvalidFloorMapException(
                        "Unknown floorMap character '" + c + "' at (" + x + "," + y + ")"
                                + " for model '" + modelCode + "'"
                );
            }
        };
    }

    public static class InvalidFloorMapException extends RuntimeException {
        public InvalidFloorMapException(String message) {
            super(message);
        }
    }
}

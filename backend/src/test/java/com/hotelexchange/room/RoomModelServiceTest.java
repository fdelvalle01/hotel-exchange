package com.hotelexchange.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.hotelexchange.realtime.GridPosition;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RoomModelServiceTest {

    @Mock
    private RoomModelRepository roomModelRepository;

    private RoomModelService service;

    @BeforeEach
    void setUp() {
        service = new RoomModelService(roomModelRepository);
    }

    // -------------------------------------------------------------------------
    // decodeFloorMap — valid cases
    // -------------------------------------------------------------------------

    @Test
    void decodeFloorMap_allZeros_returnsCorrectDimensions() {
        RoomModelEntity model = model("test", 3, 3,
                "000\n000\n000");

        RoomTile[][] tiles = service.decodeFloorMap(model);

        assertThat(tiles).hasNumberOfRows(3);
        assertThat(tiles[0]).hasSize(3);
    }

    @Test
    void decodeFloorMap_tileZero_existsWalkableHeightZero() {
        RoomModelEntity model = model("test", 1, 1, "0");

        RoomTile tile = service.decodeFloorMap(model)[0][0];

        assertThat(tile.exists()).isTrue();
        assertThat(tile.walkable()).isTrue();
        assertThat(tile.height()).isEqualTo(0);
        assertThat(tile.x()).isEqualTo(0);
        assertThat(tile.y()).isEqualTo(0);
    }

    @Test
    void decodeFloorMap_tileX_notExistsNotWalkable() {
        RoomModelEntity model = model("test", 1, 1, "x");

        RoomTile tile = service.decodeFloorMap(model)[0][0];

        assertThat(tile.exists()).isFalse();
        assertThat(tile.walkable()).isFalse();
    }

    @Test
    void decodeFloorMap_tileUpperX_notExistsNotWalkable() {
        RoomModelEntity model = model("test", 1, 1, "X");

        RoomTile tile = service.decodeFloorMap(model)[0][0];

        assertThat(tile.exists()).isFalse();
        assertThat(tile.walkable()).isFalse();
    }

    @Test
    void decodeFloorMap_tileB_existsNotWalkable_structuralBlocker() {
        RoomModelEntity model = model("test", 1, 1, "b");

        RoomTile tile = service.decodeFloorMap(model)[0][0];

        assertThat(tile.exists()).isTrue();
        assertThat(tile.walkable()).isFalse();
        assertThat(tile.height()).isEqualTo(0);
    }

    @Test
    void decodeFloorMap_tileUpperB_existsNotWalkable() {
        RoomModelEntity model = model("test", 1, 1, "B");

        RoomTile tile = service.decodeFloorMap(model)[0][0];

        assertThat(tile.exists()).isTrue();
        assertThat(tile.walkable()).isFalse();
    }

    @Test
    void decodeFloorMap_tileHeight2_existsWalkableHeight2() {
        RoomModelEntity model = model("test", 1, 1, "2");

        RoomTile tile = service.decodeFloorMap(model)[0][0];

        assertThat(tile.exists()).isTrue();
        assertThat(tile.walkable()).isTrue();
        assertThat(tile.height()).isEqualTo(2);
    }

    @Test
    void decodeFloorMap_tileHeight9_existsWalkableHeight9() {
        RoomModelEntity model = model("test", 1, 1, "9");

        RoomTile tile = service.decodeFloorMap(model)[0][0];

        assertThat(tile.exists()).isTrue();
        assertThat(tile.walkable()).isTrue();
        assertThat(tile.height()).isEqualTo(9);
    }

    @Test
    void decodeFloorMap_12x12AllZeros_produces144Tiles() {
        String floorMap = "000000000000\n000000000000\n000000000000\n000000000000\n"
                + "000000000000\n000000000000\n000000000000\n000000000000\n"
                + "000000000000\n000000000000\n000000000000\n000000000000";
        RoomModelEntity model = model("exchange_lobby_01", 12, 12, floorMap);

        RoomTile[][] tiles = service.decodeFloorMap(model);

        assertThat(tiles).hasNumberOfRows(12);
        for (RoomTile[] row : tiles) {
            assertThat(row).hasSize(12);
            for (RoomTile tile : row) {
                assertThat(tile.exists()).isTrue();
                assertThat(tile.walkable()).isTrue();
            }
        }
    }

    @Test
    void decodeFloorMap_mixedTiles_irregularShape() {
        RoomModelEntity model = model("test", 3, 3,
                "000\nxxx\n000");

        RoomTile[][] tiles = service.decodeFloorMap(model);

        assertThat(tiles[0][0].exists()).isTrue();
        assertThat(tiles[1][0].exists()).isFalse();
        assertThat(tiles[2][0].exists()).isTrue();
    }

    // -------------------------------------------------------------------------
    // decodeFloorMap — invalid cases
    // -------------------------------------------------------------------------

    @Test
    void decodeFloorMap_wrongRowCount_throwsInvalidFloorMapException() {
        RoomModelEntity model = model("test", 3, 3, "000\n000");

        assertThatThrownBy(() -> service.decodeFloorMap(model))
                .isInstanceOf(RoomModelService.InvalidFloorMapException.class)
                .hasMessageContaining("row count");
    }

    @Test
    void decodeFloorMap_wrongRowWidth_throwsInvalidFloorMapException() {
        RoomModelEntity model = model("test", 3, 3, "000\n00\n000");

        assertThatThrownBy(() -> service.decodeFloorMap(model))
                .isInstanceOf(RoomModelService.InvalidFloorMapException.class)
                .hasMessageContaining("row 1");
    }

    @Test
    void decodeFloorMap_unknownCharacter_throwsInvalidFloorMapException() {
        RoomModelEntity model = model("test", 1, 1, "z");

        assertThatThrownBy(() -> service.decodeFloorMap(model))
                .isInstanceOf(RoomModelService.InvalidFloorMapException.class)
                .hasMessageContaining("'z'");
    }

    // -------------------------------------------------------------------------
    // validateModel — spawn checks
    // -------------------------------------------------------------------------

    @Test
    void validateModel_spawnOutsideBounds_throws() {
        RoomModelEntity model = modelWithSpawn("test", 3, 3, "000\n000\n000", 5, 5);

        assertThatThrownBy(() -> service.validateModel(model))
                .isInstanceOf(RoomModelService.InvalidFloorMapException.class)
                .hasMessageContaining("Spawn");
    }

    @Test
    void validateModel_spawnOnVoidTile_throws() {
        RoomModelEntity model = modelWithSpawn("test", 3, 3, "x0x\nx0x\nx0x", 0, 0);

        assertThatThrownBy(() -> service.validateModel(model))
                .isInstanceOf(RoomModelService.InvalidFloorMapException.class)
                .hasMessageContaining("not walkable");
    }

    @Test
    void validateModel_spawnOnBlockedTile_throws() {
        RoomModelEntity model = modelWithSpawn("test", 3, 3, "b00\n000\n000", 0, 0);

        assertThatThrownBy(() -> service.validateModel(model))
                .isInstanceOf(RoomModelService.InvalidFloorMapException.class)
                .hasMessageContaining("not walkable");
    }

    @Test
    void validateModel_validSpawnOnWalkableTile_doesNotThrow() {
        RoomModelEntity model = modelWithSpawn("test", 3, 3, "000\n000\n000", 1, 1);

        service.validateModel(model);
    }

    // -------------------------------------------------------------------------
    // existingTileSet / walkableTileSet / structuralBlockedTileSet
    // -------------------------------------------------------------------------

    @Test
    void existingTileSet_includesExistingTiles_excludesVoid() {
        RoomModelEntity model = model("test", 2, 2, "0x\nx0");

        Set<GridPosition> existing = service.existingTileSet(model);

        assertThat(existing).containsExactlyInAnyOrder(
                new GridPosition(0, 0),
                new GridPosition(1, 1)
        );
    }

    @Test
    void walkableTileSet_excludesVoidAndStructuralBlockers() {
        RoomModelEntity model = model("test", 3, 1, "0bx");

        Set<GridPosition> walkable = service.walkableTileSet(model);

        assertThat(walkable).containsExactly(new GridPosition(0, 0));
    }

    @Test
    void structuralBlockedTileSet_includesOnlyBTiles() {
        RoomModelEntity model = model("test", 3, 1, "0bx");

        Set<GridPosition> blocked = service.structuralBlockedTileSet(model);

        assertThat(blocked).containsExactly(new GridPosition(1, 0));
    }

    // -------------------------------------------------------------------------
    // helpers
    // -------------------------------------------------------------------------

    private RoomModelEntity model(String code, int width, int height, String floorMap) {
        return modelWithSpawn(code, width, height, floorMap, 0, 0);
    }

    private RoomModelEntity modelWithSpawn(String code, int width, int height, String floorMap, int spawnX, int spawnY) {
        RoomModelEntity entity = new RoomModelEntity();
        ReflectionTestUtils.setField(entity, "code", code);
        ReflectionTestUtils.setField(entity, "width", width);
        ReflectionTestUtils.setField(entity, "height", height);
        ReflectionTestUtils.setField(entity, "floorMap", floorMap);
        ReflectionTestUtils.setField(entity, "spawnX", spawnX);
        ReflectionTestUtils.setField(entity, "spawnY", spawnY);
        ReflectionTestUtils.setField(entity, "wallMode", "STANDARD");
        ReflectionTestUtils.setField(entity, "wallHeight", 3);
        ReflectionTestUtils.setField(entity, "spawnDirection", "S");
        ReflectionTestUtils.setField(entity, "theme", "DEFAULT");
        return entity;
    }
}

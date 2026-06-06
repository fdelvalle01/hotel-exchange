package com.hotelexchange.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.hotelexchange.furniture.BlockedTileDto;
import com.hotelexchange.furniture.RoomFurnitureService;
import com.hotelexchange.realtime.GridPosition;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RoomLayoutServiceTest {

    @Mock
    private RoomBlockedTileRepository blockedTileRepository;

    @Mock
    private RoomFurnitureService roomFurnitureService;

    @Mock
    private RoomModelRepository roomModelRepository;

    private RoomLayoutService service;

    @BeforeEach
    void setUp() {
        service = new RoomLayoutService(
                blockedTileRepository,
                new RoomModelService(roomModelRepository),
                roomFurnitureService
        );
    }

    @Test
    void blockedTileDtosIncludeStructuralLegacyAndFurnitureReasons() {
        RoomEntity room = roomWithModel(1L, 3, 2, "test_model");
        RoomModelEntity model = model("test_model", 3, 2, "0b0\n000");
        when(roomModelRepository.findByCode("test_model")).thenReturn(Optional.of(model));
        when(blockedTileRepository.findByRoom_Id(1L)).thenReturn(List.of(blockedTile(2, 1)));
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of(new GridPosition(0, 1)));

        List<BlockedTileDto> blockedTiles = service.blockedTileDtos(room);

        assertThat(blockedTiles)
                .extracting(BlockedTileDto::x, BlockedTileDto::y, BlockedTileDto::reason)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1, 0, "STRUCTURAL"),
                        org.assertj.core.groups.Tuple.tuple(0, 1, "FURNITURE"),
                        org.assertj.core.groups.Tuple.tuple(2, 1, "LEGACY_BLOCKER")
                );
    }

    @Test
    void roomWithoutModelCodeKeepsRectangularTileExistence() {
        RoomEntity room = room(1L, 3, 2);
        when(blockedTileRepository.findByRoom_Id(1L)).thenReturn(List.of());
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of());

        assertThat(service.tileExists(room, 2, 1)).isTrue();
        assertThat(service.tileExists(room, 3, 1)).isFalse();
        assertThat(service.walkableTileSet(room, service.blockedTileSet(room))).hasSize(6);
    }

    private RoomEntity room(Long id, int width, int height) {
        RoomEntity room = new RoomEntity();
        ReflectionTestUtils.setField(room, "id", id);
        ReflectionTestUtils.setField(room, "name", "Main Lobby");
        ReflectionTestUtils.setField(room, "width", width);
        ReflectionTestUtils.setField(room, "height", height);
        ReflectionTestUtils.setField(room, "spawnX", 1);
        ReflectionTestUtils.setField(room, "spawnY", 1);
        return room;
    }

    private RoomEntity roomWithModel(Long id, int width, int height, String modelCode) {
        RoomEntity room = room(id, width, height);
        ReflectionTestUtils.setField(room, "modelCode", modelCode);
        return room;
    }

    private RoomModelEntity model(String code, int width, int height, String floorMap) {
        RoomModelEntity entity = new RoomModelEntity();
        ReflectionTestUtils.setField(entity, "code", code);
        ReflectionTestUtils.setField(entity, "width", width);
        ReflectionTestUtils.setField(entity, "height", height);
        ReflectionTestUtils.setField(entity, "floorMap", floorMap);
        ReflectionTestUtils.setField(entity, "spawnX", 0);
        ReflectionTestUtils.setField(entity, "spawnY", 0);
        ReflectionTestUtils.setField(entity, "wallMode", "STANDARD");
        ReflectionTestUtils.setField(entity, "wallHeight", 3);
        ReflectionTestUtils.setField(entity, "spawnDirection", "S");
        ReflectionTestUtils.setField(entity, "theme", "DEFAULT");
        return entity;
    }

    private RoomBlockedTileEntity blockedTile(int x, int y) {
        RoomBlockedTileEntity tile = new RoomBlockedTileEntity();
        ReflectionTestUtils.setField(tile, "x", x);
        ReflectionTestUtils.setField(tile, "y", y);
        return tile;
    }
}

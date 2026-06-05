package com.hotelexchange.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.hotelexchange.error.BadRoomEventException;
import com.hotelexchange.furniture.RoomFurnitureService;
import com.hotelexchange.room.RoomBlockedTileEntity;
import com.hotelexchange.room.RoomBlockedTileRepository;
import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomLayoutService;
import com.hotelexchange.room.UserRoomStateEntity;
import com.hotelexchange.room.UserRoomStateRepository;
import com.hotelexchange.user.UserEntity;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RoomStateServiceTest {

    @Mock
    private UserRoomStateRepository userRoomStateRepository;

    @Mock
    private RoomBlockedTileRepository blockedTileRepository;

    @Mock
    private RoomFurnitureService roomFurnitureService;

    private RoomStateService roomStateService;

    @BeforeEach
    void setUp() {
        RoomLayoutService roomLayoutService = new RoomLayoutService(blockedTileRepository, roomFurnitureService);
        roomStateService = new RoomStateService(
                userRoomStateRepository,
                roomLayoutService,
                new PathfindingService(roomLayoutService)
        );
    }

    @Test
    void validMovementIsSaved() {
        RoomEntity room = room(1L, 12, 12);
        UserEntity user = user(1L, "trader");
        GridPosition start = new GridPosition(1, 1);
        when(blockedTileRepository.findByRoom_Id(1L)).thenReturn(List.of());
        noFurnitureBlockers(room);
        when(userRoomStateRepository.findByRoom_IdAndUser_Id(1L, 1L)).thenReturn(Optional.empty());
        when(userRoomStateRepository.save(any(UserRoomStateEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MovementResult movement = roomStateService.persistMovement(room, user, start, new MovePayload(4, 5, "east"));

        ArgumentCaptor<UserRoomStateEntity> captor = ArgumentCaptor.forClass(UserRoomStateEntity.class);
        verify(userRoomStateRepository).save(captor.capture());
        assertThat(movement.position()).isEqualTo(new GridPosition(4, 5));
        assertThat(movement.path()).isNotEmpty();
        assertThat(movement.path().get(movement.path().size() - 1)).isEqualTo(new GridPosition(4, 5));
        assertThat(captor.getValue().getX()).isEqualTo(4);
        assertThat(captor.getValue().getY()).isEqualTo(5);
        assertThat(captor.getValue().getDirection()).isEqualTo(movement.direction());
    }

    @Test
    void movementOutsideRoomIsRejected() {
        RoomEntity room = room(1L, 12, 12);
        UserEntity user = user(1L, "trader");
        when(blockedTileRepository.findByRoom_Id(1L)).thenReturn(List.of());
        noFurnitureBlockers(room);

        assertThatThrownBy(() -> roomStateService.persistMovement(room, user, new GridPosition(1, 1), new MovePayload(12, 0, "east")))
                .isInstanceOf(BadRoomEventException.class)
                .hasMessageContaining("outside room grid");

        verify(userRoomStateRepository, never()).save(any());
    }

    @Test
    void movementToBlockedTileIsRejected() {
        RoomEntity room = room(1L, 12, 12);
        UserEntity user = user(1L, "trader");
        when(blockedTileRepository.findByRoom_Id(1L)).thenReturn(List.of(blockedTile(5, 5)));
        noFurnitureBlockers(room);

        assertThatThrownBy(() -> roomStateService.persistMovement(room, user, new GridPosition(1, 1), new MovePayload(5, 5, "south")))
                .isInstanceOf(BadRoomEventException.class)
                .hasMessageContaining("blocked");

        verify(userRoomStateRepository, never()).save(any());
    }

    @Test
    void movementToFurnitureBlockedTileIsRejectedWithClearMessage() {
        RoomEntity room = room(1L, 12, 12);
        UserEntity user = user(1L, "trader");
        GridPosition destination = new GridPosition(7, 5);
        when(blockedTileRepository.findByRoom_Id(1L)).thenReturn(List.of());
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of(destination));
        when(roomFurnitureService.isFurnitureBlockedTile(room, destination)).thenReturn(true);

        assertThatThrownBy(() -> roomStateService.persistMovement(room, user, new GridPosition(1, 1), new MovePayload(7, 5, "south")))
                .isInstanceOf(BadRoomEventException.class)
                .hasMessageContaining("blocked by furniture");

        verify(userRoomStateRepository, never()).save(any());
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

    private RoomBlockedTileEntity blockedTile(int x, int y) {
        RoomBlockedTileEntity tile = new RoomBlockedTileEntity();
        ReflectionTestUtils.setField(tile, "x", x);
        ReflectionTestUtils.setField(tile, "y", y);
        return tile;
    }

    private void noFurnitureBlockers(RoomEntity room) {
        when(roomFurnitureService.blockedTileSet(room)).thenReturn(Set.of());
    }

    private UserEntity user(Long id, String username) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "id", id);
        user.setUsername(username);
        user.setDisplayName(username);
        user.setPasswordHash("hash");
        return user;
    }
}

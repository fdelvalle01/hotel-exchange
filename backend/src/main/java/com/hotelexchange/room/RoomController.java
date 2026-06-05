package com.hotelexchange.room;

import com.hotelexchange.error.NotFoundException;
import com.hotelexchange.furniture.RoomFurnitureService;
import com.hotelexchange.realtime.RoomPresenceRegistry;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomRepository roomRepository;
    private final RoomLayoutService roomLayoutService;
    private final RoomFurnitureService roomFurnitureService;
    private final RoomPresenceRegistry presenceRegistry;

    public RoomController(
            RoomRepository roomRepository,
            RoomLayoutService roomLayoutService,
            RoomFurnitureService roomFurnitureService,
            RoomPresenceRegistry presenceRegistry
    ) {
        this.roomRepository = roomRepository;
        this.roomLayoutService = roomLayoutService;
        this.roomFurnitureService = roomFurnitureService;
        this.presenceRegistry = presenceRegistry;
    }

    @GetMapping
    public List<RoomDetailDto> listRooms() {
        return roomRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{roomId}")
    public RoomDetailDto getRoom(@PathVariable Long roomId) {
        RoomEntity room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));
        return toResponse(room);
    }

    private RoomDetailDto toResponse(RoomEntity room) {
        return RoomDetailDto.from(
                room,
                roomLayoutService.blockedTileDtos(room),
                roomFurnitureService.furnitureForRoom(room),
                presenceRegistry.onlineCount(room.getId())
        );
    }
}

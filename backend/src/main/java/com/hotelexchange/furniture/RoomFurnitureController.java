package com.hotelexchange.furniture;

import com.hotelexchange.error.NotFoundException;
import com.hotelexchange.realtime.ActorDto;
import com.hotelexchange.realtime.FurnitureAddedPayload;
import com.hotelexchange.realtime.RoomEventBroadcaster;
import com.hotelexchange.realtime.RoomEventEnvelope;
import com.hotelexchange.realtime.RoomEventType;
import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomRepository;
import com.hotelexchange.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class RoomFurnitureController {

    private static final Logger log = LoggerFactory.getLogger(RoomFurnitureController.class);

    private final RoomRepository roomRepository;
    private final FurniturePlacementService placementService;
    private final RoomEventBroadcaster broadcaster;

    public RoomFurnitureController(
            RoomRepository roomRepository,
            FurniturePlacementService placementService,
            RoomEventBroadcaster broadcaster
    ) {
        this.roomRepository = roomRepository;
        this.placementService = placementService;
        this.broadcaster = broadcaster;
    }

    @PostMapping("/{roomId}/furniture")
    @ResponseStatus(HttpStatus.CREATED)
    public PlaceFurnitureResponse placeFurniture(
            @PathVariable Long roomId,
            @Valid @RequestBody PlaceFurnitureRequest request,
            @AuthenticationPrincipal AuthenticatedUser actor
    ) {
        RoomEntity room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));

        PlaceFurnitureResponse response = placementService.placeFurniture(actor.id(), room, request);

        broadcastFurnitureAdded(roomId, response.placedFurniture(), actor);

        return response;
    }

    private void broadcastFurnitureAdded(Long roomId, RoomFurnitureDto furniture, AuthenticatedUser actor) {
        FurnitureAddedPayload payload = new FurnitureAddedPayload(furniture, actor.id(), actor.username());
        RoomEventEnvelope event = RoomEventEnvelope.of(
                RoomEventType.ROOM_FURNITURE_ADDED, roomId, ActorDto.from(actor), payload);
        try {
            broadcaster.broadcast(roomId, event);
        } catch (Exception exception) {
            log.warn("Failed to broadcast ROOM_FURNITURE_ADDED for room {}: {}", roomId, exception.getMessage());
        }
    }
}

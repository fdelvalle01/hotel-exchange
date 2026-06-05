package com.hotelexchange.realtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelexchange.chat.ChatMessageEntity;
import com.hotelexchange.chat.ChatMessageRepository;
import com.hotelexchange.config.AppProperties;
import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomRepository;
import com.hotelexchange.security.AuthenticatedUser;
import com.hotelexchange.security.JwtService;
import com.hotelexchange.user.UserEntity;
import com.hotelexchange.user.UserRepository;
import io.jsonwebtoken.JwtException;
import java.io.IOException;
import java.net.URI;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class RoomWebSocketHandler extends TextWebSocketHandler {

    private static final String ROOM_ID_ATTRIBUTE = "roomId";
    private static final String ROOM_ATTRIBUTE = "room";
    private static final String USER_ATTRIBUTE = "user";

    private final AppProperties properties;
    private final ChatMessageRepository chatMessageRepository;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;
    private final RoomPresenceRegistry presenceRegistry;
    private final RoomRepository roomRepository;
    private final RoomStateService roomStateService;
    private final UserRepository userRepository;

    public RoomWebSocketHandler(
            AppProperties properties,
            ChatMessageRepository chatMessageRepository,
            JwtService jwtService,
            ObjectMapper objectMapper,
            RoomPresenceRegistry presenceRegistry,
            RoomRepository roomRepository,
            RoomStateService roomStateService,
            UserRepository userRepository
    ) {
        this.properties = properties;
        this.chatMessageRepository = chatMessageRepository;
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
        this.presenceRegistry = presenceRegistry;
        this.roomRepository = roomRepository;
        this.roomStateService = roomStateService;
        this.userRepository = userRepository;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            Long roomId = parseRoomId(session.getUri());
            RoomEntity room = roomRepository.findById(roomId).orElseThrow();
            AuthenticatedUser authenticatedUser = authenticate(session.getUri());
            UserEntity userEntity = userRepository.findById(authenticatedUser.id()).orElseThrow();
            RoomStateSnapshot joinState = roomStateService.resolveJoinState(room, userEntity);

            session.getAttributes().put(ROOM_ID_ATTRIBUTE, roomId);
            session.getAttributes().put(ROOM_ATTRIBUTE, room);
            session.getAttributes().put(USER_ATTRIBUTE, authenticatedUser);

            ActorDto actor = ActorDto.from(authenticatedUser);
            presenceRegistry.join(roomId, session, actor, joinState);
            broadcast(roomId, RoomEventEnvelope.of(
                    RoomEventType.ROOM_JOIN,
                    roomId,
                    actor,
                    new UserMovedPayload(joinState.position().x(), joinState.position().y(), joinState.direction(), List.of())
            ));
            broadcastPresence(roomId);
        } catch (JwtException | IllegalArgumentException exception) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Authentication failed"));
        } catch (Exception exception) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Room unavailable"));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        if (message.getPayloadLength() > properties.getWebsocket().getMaxPayloadBytes()) {
            sendError(session, "WebSocket payload too large");
            return;
        }

        InboundRoomEvent inboundEvent;
        try {
            inboundEvent = objectMapper.readValue(message.getPayload(), InboundRoomEvent.class);
        } catch (JsonProcessingException exception) {
            sendError(session, "Invalid WebSocket message");
            return;
        }

        if (inboundEvent.type() == null) {
            sendError(session, "Missing WebSocket event type");
            return;
        }

        try {
            switch (inboundEvent.type()) {
                case ROOM_JOIN -> broadcastPresence(roomId(session));
                case ROOM_LEAVE -> session.close(CloseStatus.NORMAL);
                case USER_MOVED -> handleUserMoved(session, inboundEvent.payload());
                case CHAT_MESSAGE -> handleChatMessage(session, inboundEvent.payload());
                case PRESENCE_UPDATE, ERROR -> sendError(session, "Unsupported client event type");
            }
        } catch (IllegalArgumentException exception) {
            sendError(session, "Invalid room event payload");
        } catch (com.hotelexchange.error.BadRoomEventException exception) {
            sendError(session, exception.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long roomId = optionalRoomId(session);
        if (roomId == null) {
            return;
        }
        RoomClient removed = presenceRegistry.leave(roomId, session.getId());
        if (removed != null) {
            broadcast(roomId, RoomEventEnvelope.of(RoomEventType.ROOM_LEAVE, roomId, removed.user(), null));
            broadcastPresence(roomId);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    private void handleUserMoved(WebSocketSession session, JsonNode payload) throws IOException {
        RoomEntity room = room(session);
        Long roomId = roomId(session);
        AuthenticatedUser authenticatedUser = user(session);
        UserEntity userEntity = userRepository.findById(authenticatedUser.id()).orElseThrow();
        MovePayload movePayload = readMovePayload(payload);
        RoomClient client = presenceRegistry.client(roomId, session.getId())
                .orElseThrow(() -> new IllegalStateException("Missing room client"));
        MovementResult movement = roomStateService.persistMovement(room, userEntity, client.position(), movePayload);
        RoomStateSnapshot state = new RoomStateSnapshot(movement.position(), movement.direction());

        presenceRegistry.move(roomId, session.getId(), state);
        broadcast(roomId, RoomEventEnvelope.of(
                RoomEventType.USER_MOVED,
                roomId,
                ActorDto.from(authenticatedUser),
                new UserMovedPayload(state.position().x(), state.position().y(), state.direction(), movement.path())
        ));
        broadcastPresence(roomId);
    }

    private void handleChatMessage(WebSocketSession session, JsonNode payload) throws IOException {
        String message = sanitizeMessage(payload == null ? "" : payload.path("message").asText(""));
        if (message.isBlank()) {
            sendError(session, "Chat message cannot be empty");
            return;
        }
        if (message.length() > properties.getChat().getMaxLength()) {
            sendError(session, "Chat message is too long");
            return;
        }

        RoomEntity room = room(session);
        AuthenticatedUser authenticatedUser = user(session);
        UserEntity user = userRepository.findById(authenticatedUser.id()).orElseThrow();

        ChatMessageEntity chatMessage = new ChatMessageEntity();
        chatMessage.setRoom(room);
        chatMessage.setUser(user);
        chatMessage.setMessage(message);
        chatMessageRepository.save(chatMessage);

        broadcast(room.getId(), RoomEventEnvelope.of(
                RoomEventType.CHAT_MESSAGE,
                room.getId(),
                ActorDto.from(authenticatedUser),
                new ChatPayload(message)
        ));
    }

    private MovePayload readMovePayload(JsonNode payload) throws JsonProcessingException {
        if (payload == null
                || !payload.has("x")
                || !payload.has("y")
                || !payload.path("x").isIntegralNumber()
                || !payload.path("y").isIntegralNumber()
                || !payload.path("x").canConvertToInt()
                || !payload.path("y").canConvertToInt()) {
            throw new IllegalArgumentException("Missing position");
        }
        return objectMapper.treeToValue(payload, MovePayload.class);
    }

    private String sanitizeMessage(String rawMessage) {
        String withoutControlCharacters = rawMessage.replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "");
        return withoutControlCharacters.replaceAll("\\s+", " ").trim();
    }

    private AuthenticatedUser authenticate(URI uri) {
        String token = UriComponentsBuilder.fromUri(uri)
                .build()
                .getQueryParams()
                .getFirst("token");
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Missing token");
        }
        return jwtService.readUser(token);
    }

    private Long parseRoomId(URI uri) {
        if (uri == null) {
            throw new IllegalArgumentException("Missing WebSocket URI");
        }
        String path = uri.getPath();
        String candidate = path.substring(path.lastIndexOf('/') + 1);
        return Long.parseLong(candidate);
    }

    private void broadcastPresence(Long roomId) throws IOException {
        PresencePayload payload = new PresencePayload(presenceRegistry.presence(roomId));
        broadcast(roomId, RoomEventEnvelope.of(RoomEventType.PRESENCE_UPDATE, roomId, null, payload));
    }

    private void broadcast(Long roomId, RoomEventEnvelope event) throws IOException {
        String payload = objectMapper.writeValueAsString(event);
        List<WebSocketSession> sessions = presenceRegistry.sessions(roomId);
        for (WebSocketSession session : sessions) {
            send(session, payload);
        }
    }

    private void sendError(WebSocketSession session, String message) throws IOException {
        Long roomId = optionalRoomId(session);
        RoomEventEnvelope error = RoomEventEnvelope.of(RoomEventType.ERROR, roomId, null, new ChatPayload(message));
        send(session, objectMapper.writeValueAsString(error));
    }

    private void send(WebSocketSession session, String payload) throws IOException {
        if (!session.isOpen()) {
            return;
        }
        synchronized (session) {
            session.sendMessage(new TextMessage(payload));
        }
    }

    private Long roomId(WebSocketSession session) {
        Long roomId = optionalRoomId(session);
        if (roomId == null) {
            throw new IllegalStateException("Missing room");
        }
        return roomId;
    }

    private Long optionalRoomId(WebSocketSession session) {
        Object value = session.getAttributes().get(ROOM_ID_ATTRIBUTE);
        return value instanceof Long roomId ? roomId : null;
    }

    private RoomEntity room(WebSocketSession session) {
        Object value = session.getAttributes().get(ROOM_ATTRIBUTE);
        if (value instanceof RoomEntity room) {
            return room;
        }
        throw new IllegalStateException("Missing room");
    }

    private AuthenticatedUser user(WebSocketSession session) {
        Object value = session.getAttributes().get(USER_ATTRIBUTE);
        if (value instanceof AuthenticatedUser authenticatedUser) {
            return authenticatedUser;
        }
        throw new IllegalStateException("Missing user");
    }
}

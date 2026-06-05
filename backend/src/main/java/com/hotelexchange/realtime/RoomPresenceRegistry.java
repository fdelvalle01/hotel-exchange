package com.hotelexchange.realtime;

import java.util.ArrayList;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

@Component
public class RoomPresenceRegistry {

    private final Map<Long, Map<String, RoomClient>> rooms = new ConcurrentHashMap<>();

    public void join(Long roomId, WebSocketSession session, ActorDto user, RoomStateSnapshot state) {
        rooms.computeIfAbsent(roomId, ignored -> new ConcurrentHashMap<>())
                .put(session.getId(), new RoomClient(
                        session.getId(),
                        session,
                        user,
                        state.position(),
                        state.direction(),
                        Instant.now()
                ));
    }

    public RoomClient move(Long roomId, String sessionId, RoomStateSnapshot state) {
        Map<String, RoomClient> clients = rooms.get(roomId);
        if (clients == null) {
            return null;
        }
        return clients.computeIfPresent(sessionId, (ignored, client) ->
                new RoomClient(
                        client.sessionId(),
                        client.session(),
                        client.user(),
                        state.position(),
                        state.direction(),
                        client.joinedAt()
                )
        );
    }

    public Optional<RoomClient> client(Long roomId, String sessionId) {
        Map<String, RoomClient> clients = rooms.get(roomId);
        if (clients == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(clients.get(sessionId));
    }

    public RoomClient leave(Long roomId, String sessionId) {
        Map<String, RoomClient> clients = rooms.get(roomId);
        if (clients == null) {
            return null;
        }
        RoomClient removed = clients.remove(sessionId);
        if (clients.isEmpty()) {
            rooms.remove(roomId);
        }
        return removed;
    }

    public List<WebSocketSession> sessions(Long roomId) {
        Map<String, RoomClient> clients = rooms.get(roomId);
        if (clients == null) {
            return List.of();
        }
        return clients.values().stream()
                .map(RoomClient::session)
                .filter(WebSocketSession::isOpen)
                .toList();
    }

    public List<PresenceUserDto> presence(Long roomId) {
        Map<String, RoomClient> clients = rooms.get(roomId);
        if (clients == null) {
            return List.of();
        }

        Map<Long, PresenceUserDto> uniqueUsers = new LinkedHashMap<>();
        for (RoomClient client : new ArrayList<>(clients.values())) {
            uniqueUsers.put(client.user().id(), PresenceUserDto.from(client));
        }
        return List.copyOf(uniqueUsers.values());
    }

    public int onlineCount(Long roomId) {
        Map<String, RoomClient> clients = rooms.get(roomId);
        if (clients == null) {
            return 0;
        }
        return (int) clients.values().stream()
                .filter(client -> client.session().isOpen())
                .map(client -> client.user().id())
                .distinct()
                .count();
    }

    public int totalOnlineCount() {
        return (int) rooms.values().stream()
                .flatMap(clients -> clients.values().stream())
                .filter(client -> client.session().isOpen())
                .map(client -> client.user().id())
                .distinct()
                .count();
    }
}

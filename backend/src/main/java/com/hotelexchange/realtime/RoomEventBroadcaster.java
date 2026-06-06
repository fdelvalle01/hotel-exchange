package com.hotelexchange.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Component
public class RoomEventBroadcaster {

    private final ObjectMapper objectMapper;
    private final RoomPresenceRegistry presenceRegistry;

    public RoomEventBroadcaster(ObjectMapper objectMapper, RoomPresenceRegistry presenceRegistry) {
        this.objectMapper = objectMapper;
        this.presenceRegistry = presenceRegistry;
    }

    public void broadcast(Long roomId, RoomEventEnvelope event) throws IOException {
        String payload = objectMapper.writeValueAsString(event);
        List<WebSocketSession> sessions = presenceRegistry.sessions(roomId);
        for (WebSocketSession session : sessions) {
            send(session, payload);
        }
    }

    private void send(WebSocketSession session, String payload) throws IOException {
        if (!session.isOpen()) {
            return;
        }
        synchronized (session) {
            session.sendMessage(new TextMessage(payload));
        }
    }
}

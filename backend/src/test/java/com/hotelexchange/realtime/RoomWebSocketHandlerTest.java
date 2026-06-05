package com.hotelexchange.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelexchange.chat.ChatMessageRepository;
import com.hotelexchange.config.AppProperties;
import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.room.RoomRepository;
import com.hotelexchange.security.AuthenticatedUser;
import com.hotelexchange.security.JwtService;
import com.hotelexchange.user.UserEntity;
import com.hotelexchange.user.UserRepository;
import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@ExtendWith(MockitoExtension.class)
class RoomWebSocketHandlerTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomStateService roomStateService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WebSocketSession session;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final RoomPresenceRegistry presenceRegistry = new RoomPresenceRegistry();
    private final Map<String, Object> sessionAttributes = new HashMap<>();

    private RoomEntity room;
    private UserEntity user;
    private RoomWebSocketHandler handler;

    @BeforeEach
    void setUp() {
        room = room(1L, 12, 12);
        user = user(1L, "trader");
        handler = new RoomWebSocketHandler(
                new AppProperties(),
                chatMessageRepository,
                jwtService,
                objectMapper,
                presenceRegistry,
                roomRepository,
                roomStateService,
                userRepository
        );
    }

    @Test
    void joinRoomSendsInitialPresence() throws Exception {
        establishSession();

        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session, atLeast(2)).sendMessage(captor.capture());

        JsonNode presenceEvent = parse(captor.getAllValues()).stream()
                .filter(node -> "PRESENCE_UPDATE".equals(node.path("type").asText()))
                .findFirst()
                .orElseThrow();

        JsonNode firstUser = presenceEvent.path("payload").path("users").get(0);
        assertThat(firstUser.path("userId").asLong()).isEqualTo(1L);
        assertThat(firstUser.path("username").asText()).isEqualTo("trader");
        assertThat(firstUser.path("x").asInt()).isEqualTo(2);
        assertThat(firstUser.path("y").asInt()).isEqualTo(3);
        assertThat(firstUser.path("joinedAt").isMissingNode()).isFalse();
        assertThat(firstUser.path("joinedAt").isNull()).isFalse();
    }

    @Test
    void emptyChatMessageIsRejected() throws Exception {
        establishSession();
        clearInvocations(session, chatMessageRepository);

        handler.handleTextMessage(session, new TextMessage("""
                {"type":"CHAT_MESSAGE","payload":{"message":"   "}}
                """));

        verify(chatMessageRepository, never()).save(any());
        JsonNode errorEvent = singleSentEvent();
        assertThat(errorEvent.path("type").asText()).isEqualTo("ERROR");
        assertThat(errorEvent.path("payload").path("message").asText()).contains("empty");
    }

    @Test
    void longChatMessageIsRejected() throws Exception {
        establishSession();
        clearInvocations(session, chatMessageRepository);
        String longMessage = "a".repeat(241);

        handler.handleTextMessage(session, new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "CHAT_MESSAGE",
                "payload", Map.of("message", longMessage)
        ))));

        verify(chatMessageRepository, never()).save(any());
        JsonNode errorEvent = singleSentEvent();
        assertThat(errorEvent.path("type").asText()).isEqualTo("ERROR");
        assertThat(errorEvent.path("payload").path("message").asText()).contains("too long");
    }

    private void establishSession() throws Exception {
        when(session.getId()).thenReturn("session-1");
        when(session.getUri()).thenReturn(URI.create("ws://localhost/ws/rooms/1?token=test-token"));
        when(session.getAttributes()).thenReturn(sessionAttributes);
        when(session.isOpen()).thenReturn(true);
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(jwtService.readUser("test-token")).thenReturn(new AuthenticatedUser(1L, "trader", "trader"));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(roomStateService.resolveJoinState(room, user))
                .thenReturn(new RoomStateSnapshot(new GridPosition(2, 3), "south"));

        handler.afterConnectionEstablished(session);
    }

    private JsonNode singleSentEvent() throws Exception {
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session).sendMessage(captor.capture());
        return objectMapper.readTree(captor.getValue().getPayload());
    }

    private List<JsonNode> parse(List<TextMessage> messages) {
        return messages.stream()
                .map(message -> {
                    try {
                        return objectMapper.readTree(message.getPayload());
                    } catch (Exception exception) {
                        throw new IllegalStateException(exception);
                    }
                })
                .toList();
    }

    private RoomEntity room(Long id, int width, int height) {
        RoomEntity room = new RoomEntity();
        ReflectionTestUtils.setField(room, "id", id);
        ReflectionTestUtils.setField(room, "name", "Main Lobby");
        ReflectionTestUtils.setField(room, "width", width);
        ReflectionTestUtils.setField(room, "height", height);
        return room;
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

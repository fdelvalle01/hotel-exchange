import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PhaserRoom, PhaserRoomHandle } from '../game/PhaserRoom';
import { ApiError } from '../services/httpClient';
import { getRoom } from '../services/rooms.service';
import { RoomWebSocketClient } from '../services/wsClient';
import { useSession } from '../state/session';
import type {
  ChatLine,
  ChatPayload,
  ConnectionStatus,
  GridPosition,
  PresencePayload,
  PresenceUser,
  Room,
  RoomServerEvent,
} from '../types/api.types';

const MAX_CHAT_LENGTH = 240;

export function RoomPage() {
  const { roomId } = useParams();
  const numericRoomId = Number(roomId);
  const { logout, token, user } = useSession();
  const phaserRoomRef = useRef<PhaserRoomHandle | null>(null);
  const wsClientRef = useRef<RoomWebSocketClient | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRoom() {
      if (!token || !Number.isFinite(numericRoomId)) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await getRoom(numericRoomId, token);
        if (!cancelled) {
          setRoom(response);
        }
      } catch (exception) {
        if (exception instanceof ApiError && exception.status === 401) {
          if (!cancelled) {
            setError('Session expired. Please log in again.');
            logout();
          }
          return;
        }

        const message = exception instanceof ApiError ? exception.message : 'Could not load room.';
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRoom();
    return () => {
      cancelled = true;
    };
  }, [logout, numericRoomId, token]);

  const appendSystemLine = useCallback((message: string) => {
    setMessages((current) => current.concat({
      id: crypto.randomUUID(),
      author: 'System',
      message,
      occurredAt: new Date().toISOString(),
      system: true,
    }).slice(-80));
  }, []);

  const handleRealtimeEvent = useCallback((event: RoomServerEvent) => {
    if (event.type === 'PRESENCE_UPDATE') {
      const payload = event.payload as PresencePayload;
      setPresence(payload.users ?? []);
      phaserRoomRef.current?.setPresence(payload.users ?? []);
      return;
    }

    if (event.type === 'USER_MOVED') {
      phaserRoomRef.current?.applyEvent(event);
      return;
    }

    if (event.type === 'CHAT_MESSAGE' && event.actor) {
      const payload = event.payload as ChatPayload;
      setMessages((current) => current.concat({
        id: crypto.randomUUID(),
        author: event.actor?.displayName ?? event.actor?.username ?? 'Guest',
        message: payload.message,
        occurredAt: event.occurredAt,
      }).slice(-80));
      phaserRoomRef.current?.showChatBubble(event.actor.id, payload.message);
      return;
    }

    if (event.type === 'ROOM_JOIN' && event.actor) {
      appendSystemLine(`${event.actor.displayName} joined the room.`);
      return;
    }

    if (event.type === 'ROOM_LEAVE' && event.actor) {
      appendSystemLine(`${event.actor.displayName} left the room.`);
      return;
    }

    if (event.type === 'ERROR') {
      const payload = event.payload as ChatPayload;
      setError(payload.message);
    }
  }, [appendSystemLine]);

  useEffect(() => {
    if (!room || !token) {
      return;
    }

    const client = new RoomWebSocketClient({
      roomId: room.id,
      token,
      onEvent: handleRealtimeEvent,
      onStatusChange: setConnectionStatus,
      onError: setError,
      onAuthenticationFailed: () => {
        setError('Session expired. Please log in again.');
        logout();
      },
    });

    wsClientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      wsClientRef.current = null;
      setPresence([]);
    };
  }, [handleRealtimeEvent, logout, room, token]);

  const handleMoveRequest = useCallback((position: GridPosition) => {
    wsClientRef.current?.sendMove(position);
  }, []);

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = chatDraft.trim();
    if (!message) {
      return;
    }
    if (message.length > MAX_CHAT_LENGTH) {
      setError(`Chat messages are limited to ${MAX_CHAT_LENGTH} characters.`);
      return;
    }
    wsClientRef.current?.sendChat(message);
    setChatDraft('');
  }

  return (
    <Layout>
      <section className="room-toolbar">
        <Link className="secondary-button compact" to="/">
          <ChevronLeft size={18} aria-hidden="true" />
          <span>Lobby</span>
        </Link>
        <div>
          <p className="eyebrow">Room</p>
          <h1>{room?.name ?? 'Loading room'}</h1>
        </div>
        <span className={`status-pill ${connectionStatus}`}>
          {connectionStatus}
        </span>
      </section>

      {error && <p className="surface-alert">{error}</p>}
      {isLoading && <div className="screen-loading inline">Loading room</div>}

      {room && user && (
        <section className="room-content">
          <div className="game-surface">
            <PhaserRoom
              currentUser={user}
              onMoveRequest={handleMoveRequest}
              presence={presence}
              ref={phaserRoomRef}
              room={room}
            />
          </div>

          <aside className="room-sidebar">
            <section className="presence-panel" aria-label="Online users">
              <div className="panel-heading">
                <h2>Online</h2>
                <span>{presence.length}</span>
              </div>
              <ul className="presence-list">
                {presence.map((presenceUser) => (
                  <li key={presenceUser.userId}>
                    <span>{presenceUser.displayName}</span>
                    <small>{presenceUser.x}, {presenceUser.y}</small>
                  </li>
                ))}
              </ul>
            </section>

            <section className="chat-panel" aria-label="Room chat">
              <div className="chat-log">
                {messages.map((line) => (
                  <p className={line.system ? 'chat-line system' : 'chat-line'} key={line.id}>
                    <strong>{line.author}</strong>
                    <span>{line.message}</span>
                  </p>
                ))}
              </div>
              <form className="chat-form" onSubmit={handleChatSubmit}>
                <input
                  maxLength={MAX_CHAT_LENGTH}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="Message"
                  value={chatDraft}
                />
                <button className="icon-button send-button" type="submit" title="Send message">
                  <Send size={18} aria-hidden="true" />
                </button>
              </form>
            </section>
          </aside>
        </section>
      )}
    </Layout>
  );
}

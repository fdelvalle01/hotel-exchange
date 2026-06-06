import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { InventoryPanel } from '../components/inventory/InventoryPanel';
import { PhaserRoom, PhaserRoomHandle } from '../game/PhaserRoom';
import { ApiError } from '../services/httpClient';
import { getRoom, placeFurniture, removeFurniture, rotateFurniture } from '../services/rooms.service';
import { RoomWebSocketClient } from '../services/wsClient';
import { useSession } from '../state/session';
import type {
  ChatLine,
  ChatPayload,
  ConnectionStatus,
  FurnitureAddedPayload,
  FurnitureRemovedPayload,
  FurnitureRotatedPayload,
  GridPosition,
  InventoryItem,
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
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedPlacementItem, setSelectedPlacementItem] = useState<InventoryItem | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [furnitureMenu, setFurnitureMenu] = useState<{
    furnitureId: number;
    catalogCode: string;
    currentRotation: string;
    pctX: number;
    pctY: number;
  } | null>(null);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const addedFurnitureIdsRef = useRef<Set<number>>(new Set());
  const recentlyRotatedRef = useRef<Map<number, string>>(new Map());

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
          addedFurnitureIdsRef.current = new Set((response.furniture ?? []).map((f) => f.id));
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

  // Tracks the last time each user triggered a join message.
  // Suppresses duplicates within 3s — defends against React StrictMode's
  // intentional double-mount in development (mount → cleanup → remount).
  const recentJoinTimesRef = useRef<Map<number, number>>(new Map());

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
      const now = Date.now();
      const lastJoin = recentJoinTimesRef.current.get(event.actor.id) ?? 0;
      if (now - lastJoin < 3000) return;
      recentJoinTimesRef.current.set(event.actor.id, now);
      appendSystemLine(`${event.actor.displayName} joined the room.`);
      return;
    }

    if (event.type === 'ROOM_LEAVE' && event.actor) {
      // Clear the join timestamp so a real rejoin after leave is shown correctly.
      recentJoinTimesRef.current.delete(event.actor.id);
      appendSystemLine(`${event.actor.displayName} left the room.`);
      return;
    }

    if (event.type === 'ROOM_FURNITURE_ADDED') {
      const payload = event.payload as FurnitureAddedPayload;
      if (payload?.furniture) {
        const { id } = payload.furniture;
        if (!addedFurnitureIdsRef.current.has(id)) {
          addedFurnitureIdsRef.current.add(id);
          phaserRoomRef.current?.addFurnitureInstance(payload.furniture);
        }
      }
      return;
    }

    if (event.type === 'ROOM_FURNITURE_REMOVED') {
      const payload = event.payload as FurnitureRemovedPayload;
      if (payload?.furnitureId) {
        const { furnitureId } = payload;
        if (addedFurnitureIdsRef.current.has(furnitureId)) {
          addedFurnitureIdsRef.current.delete(furnitureId);
          phaserRoomRef.current?.removeFurnitureInstance(furnitureId);
        }
        setFurnitureMenu((prev) => (prev?.furnitureId === furnitureId ? null : prev));
      }
      return;
    }

    if (event.type === 'ROOM_FURNITURE_ROTATED') {
      const payload = event.payload as FurnitureRotatedPayload;
      if (payload?.furniture) {
        const { id, rotation, width, height } = payload.furniture;
        const recentRotation = recentlyRotatedRef.current.get(id);
        if (recentRotation === rotation) {
          recentlyRotatedRef.current.delete(id);
          return;
        }
        phaserRoomRef.current?.rotateFurnitureInstance(id, rotation, width, height);
        setFurnitureMenu((prev) =>
          prev?.furnitureId === id ? { ...prev, currentRotation: rotation } : prev,
        );
      }
      return;
    }

    if (event.type === 'ERROR') {
      const payload = event.payload as ChatPayload;
      setError(payload.message);
    }
  }, [appendSystemLine]);

  // Stable ref wrapper — lets the WS effect use the latest handleRealtimeEvent
  // without adding it to effect deps (prevents reconnect on any callback change).
  const handleRealtimeEventRef = useRef(handleRealtimeEvent);
  handleRealtimeEventRef.current = handleRealtimeEvent;

  useEffect(() => {
    if (!room || !token) {
      return;
    }

    const client = new RoomWebSocketClient({
      roomId: room.id,
      token,
      onEvent: (event) => handleRealtimeEventRef.current(event),
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
    // room.id + token are the real reconnect triggers.
    // handleRealtimeEvent is accessed via ref; logout is stable (useCallback([])).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, token, logout]);

  const handleMoveRequest = useCallback((position: GridPosition) => {
    wsClientRef.current?.sendMove(position);
  }, []);

  const handlePlacementConfirm = useCallback(async (
    item: InventoryItem,
    x: number,
    y: number,
    rotation: string,
  ) => {
    if (!room || !token) return;
    setIsPlacing(true);

    try {
      const response = await placeFurniture(room.id, { catalogCode: item.code, x, y, rotation }, token);
      const placed = response.placedFurniture;
      if (!addedFurnitureIdsRef.current.has(placed.id)) {
        addedFurnitureIdsRef.current.add(placed.id);
        phaserRoomRef.current?.addFurnitureInstance(placed);
      }
      phaserRoomRef.current?.exitPlacementMode();
      setSelectedPlacementItem(null);
    } catch (exception) {
      const message = exception instanceof ApiError ? exception.message : 'Could not place furniture.';
      setError(message);
      phaserRoomRef.current?.setPlacementPending(false);
    } finally {
      setIsPlacing(false);
    }
  }, [room, token]);

  const handlePlaceItem = useCallback((item: InventoryItem) => {
    setSelectedPlacementItem(item);
    setInventoryOpen(false);
    phaserRoomRef.current?.enterPlacementMode(item);
  }, []);

  const handleCancelPlacement = useCallback(() => {
    setSelectedPlacementItem(null);
  }, []);

  const handleFurniturePickUp = useCallback((
    furnitureId: number,
    catalogCode: string,
    currentRotation: string,
    pctX: number,
    pctY: number,
  ) => {
    setFurnitureMenu({ furnitureId, catalogCode, currentRotation, pctX, pctY });
  }, []);

  const handlePickUpConfirm = useCallback(async () => {
    if (!furnitureMenu || !room || !token) return;
    const { furnitureId } = furnitureMenu;
    setFurnitureMenu(null);
    setIsRemoving(true);
    try {
      await removeFurniture(room.id, furnitureId, token);
      if (addedFurnitureIdsRef.current.has(furnitureId)) {
        addedFurnitureIdsRef.current.delete(furnitureId);
        phaserRoomRef.current?.removeFurnitureInstance(furnitureId);
      }
      setInventoryRefreshKey((k) => k + 1);
    } catch (exception) {
      const message = exception instanceof ApiError ? exception.message : 'Could not pick up furniture.';
      setError(message);
    } finally {
      setIsRemoving(false);
    }
  }, [furnitureMenu, room, token]);

  const ROTATION_CYCLE = ['SE', 'NE', 'NW', 'SW'] as const;
  function nextRotation(current: string): string {
    const idx = ROTATION_CYCLE.indexOf(current.toUpperCase() as typeof ROTATION_CYCLE[number]);
    return ROTATION_CYCLE[(idx + 1) % 4];
  }

  const handleRotateConfirm = useCallback(async () => {
    if (!furnitureMenu || !room || !token) return;
    const { furnitureId, catalogCode, currentRotation } = furnitureMenu;
    const rotation = nextRotation(currentRotation);

    if (import.meta.env.VITE_FURNITURE_DEBUG === 'true') {
      console.log('[furniture] rotate →', {
        action: 'rotate',
        url: `/api/rooms/${room.id}/furniture/${furnitureId}/rotate`,
        method: 'PATCH',
        roomId: room.id,
        furnitureId,
        catalogCode,
        currentRotation,
        nextRotation: rotation,
      });
    }

    setIsRotating(true);
    try {
      const response = await rotateFurniture(room.id, furnitureId, rotation, token);
      const { id, rotation: newRotation, width, height } = response.furniture;
      recentlyRotatedRef.current.set(id, newRotation);
      phaserRoomRef.current?.rotateFurnitureInstance(id, newRotation, width, height);
      setFurnitureMenu((prev) =>
        prev?.furnitureId === furnitureId ? { ...prev, currentRotation: newRotation } : prev,
      );
    } catch (exception) {
      console.error('[furniture] rotate failed', exception);
      const message = exception instanceof ApiError
        ? exception.message
        : exception instanceof Error
          ? exception.message
          : 'Could not rotate furniture.';
      setError(message);
    } finally {
      setIsRotating(false);
    }
  }, [furnitureMenu, room, token]);

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
        <div className="room-toolbar-actions">
          {room && (
            <button
              className={`inventory-toggle${inventoryOpen ? ' active' : ''}`}
              onClick={() => setInventoryOpen((v) => !v)}
              type="button"
            >
              Inventory
            </button>
          )}
          <span className={`status-pill ${connectionStatus}`}>
            {connectionStatus}
          </span>
        </div>
      </section>

      {error && <p className="surface-alert">{error}</p>}
      {isLoading && <div className="screen-loading inline">Loading room</div>}

      {room && user && (
        <section className="room-content">
          {selectedPlacementItem && (
            <div className="placement-banner">
              <span>
                {isPlacing
                  ? 'Placing…'
                  : <>Placing: <strong>{selectedPlacementItem.name}</strong> — click a valid tile, ESC or right-click to cancel</>}
              </span>
              {!isPlacing && (
                <button
                  className="placement-banner-cancel"
                  onClick={() => {
                    setSelectedPlacementItem(null);
                    phaserRoomRef.current?.exitPlacementMode();
                  }}
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
          {inventoryOpen && token && (
            <InventoryPanel
              key={inventoryRefreshKey}
              onClose={() => setInventoryOpen(false)}
              onPlace={handlePlaceItem}
              token={token}
            />
          )}
          <div className="game-surface" style={{ position: 'relative' }}>
            <PhaserRoom
              currentUser={user}
              onFurniturePickUp={handleFurniturePickUp}
              onMoveRequest={handleMoveRequest}
              onPlacementCancel={handleCancelPlacement}
              onPlacementConfirm={handlePlacementConfirm}
              presence={presence}
              ref={phaserRoomRef}
              room={room}
            />
            {furnitureMenu && !isRemoving && !isRotating && (
              <div
                className="furniture-context-menu"
                style={{
                  left: `${furnitureMenu.pctX * 100}%`,
                  top: `${furnitureMenu.pctY * 100}%`,
                }}
              >
                <button
                  className="furniture-menu-action"
                  onClick={handleRotateConfirm}
                  type="button"
                >
                  Rotate
                </button>
                <button
                  className="furniture-menu-action"
                  onClick={handlePickUpConfirm}
                  type="button"
                >
                  Pick up
                </button>
                <button
                  className="furniture-menu-cancel"
                  onClick={() => setFurnitureMenu(null)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            )}
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

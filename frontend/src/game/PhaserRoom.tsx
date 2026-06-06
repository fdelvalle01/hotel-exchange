import Phaser from 'phaser';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { RoomScene } from './scenes/RoomScene';
import type {
  GridPosition,
  InventoryItem,
  PresenceUser,
  Room,
  RoomFurniture,
  RoomServerEvent,
  User,
} from '../types/api.types';

interface PhaserRoomProps {
  room: Room;
  currentUser: User;
  presence: PresenceUser[];
  onMoveRequest: (position: GridPosition) => void;
  onPlacementCancel?: () => void;
  onPlacementConfirm?: (item: InventoryItem, x: number, y: number, rotation: string) => void;
  onFurniturePickUp?: (furnitureId: number, catalogCode: string, currentRotation: string, pctX: number, pctY: number) => void;
}

interface PendingChatBubble {
  userId: number;
  message: string;
}

export interface PhaserRoomHandle {
  applyEvent: (event: RoomServerEvent) => void;
  setPresence: (presence: PresenceUser[]) => void;
  showChatBubble: (userId: number, message: string) => void;
  enterPlacementMode: (item: InventoryItem) => void;
  exitPlacementMode: () => void;
  setPlacementPending: (pending: boolean) => void;
  addFurnitureInstance: (furniture: RoomFurniture) => void;
  removeFurnitureInstance: (furnitureId: number) => void;
  rotateFurnitureInstance: (furnitureId: number, newRotation: string, newWidth: number, newHeight: number) => void;
}

export const PhaserRoom = forwardRef<PhaserRoomHandle, PhaserRoomProps>(function PhaserRoom(
  { currentUser, onFurniturePickUp, onMoveRequest, onPlacementCancel, onPlacementConfirm, presence, room },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<RoomScene | null>(null);
  const sceneReadyRef = useRef(false);
  const pendingPresenceRef = useRef<PresenceUser[] | null>(null);
  const pendingEventsRef = useRef<RoomServerEvent[]>([]);
  const pendingChatBubblesRef = useRef<PendingChatBubble[]>([]);

  const flushPendingSceneUpdates = useCallback((scene: RoomScene) => {
    const pendingPresence = pendingPresenceRef.current;
    if (pendingPresence) {
      scene.setPresence(pendingPresence);
      pendingPresenceRef.current = null;
    }

    for (const event of pendingEventsRef.current) {
      scene.applyEvent(event);
    }
    pendingEventsRef.current = [];

    for (const chatBubble of pendingChatBubblesRef.current) {
      scene.showChatBubble(chatBubble.userId, chatBubble.message);
    }
    pendingChatBubblesRef.current = [];
  }, []);

  const setPresenceWhenReady = useCallback((nextPresence: PresenceUser[]) => {
    const scene = sceneRef.current;
    if (scene && sceneReadyRef.current && scene.isReady()) {
      scene.setPresence(nextPresence);
      return;
    }

    pendingPresenceRef.current = nextPresence.map((presenceUser) => ({ ...presenceUser }));
  }, []);

  const applyEventWhenReady = useCallback((event: RoomServerEvent) => {
    const scene = sceneRef.current;
    if (scene && sceneReadyRef.current && scene.isReady()) {
      scene.applyEvent(event);
      return;
    }

    pendingEventsRef.current.push(event);
  }, []);

  const showChatBubbleWhenReady = useCallback((userId: number, message: string) => {
    const scene = sceneRef.current;
    if (scene && sceneReadyRef.current && scene.isReady()) {
      scene.showChatBubble(userId, message);
      return;
    }

    pendingChatBubblesRef.current.push({ userId, message });
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const scene = new RoomScene({
      currentUser,
      onMoveRequest,
      onFurniturePickUp,
      onReady: () => {
        if (sceneRef.current !== scene) {
          return;
        }

        sceneReadyRef.current = true;
        flushPendingSceneUpdates(scene);
      },
      room,
    });

    sceneReadyRef.current = false;
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 960,
      height: 620,
      backgroundColor: '#161513',
      scene: [scene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });

    gameRef.current = game;
    if (scene.isReady()) {
      sceneReadyRef.current = true;
      flushPendingSceneUpdates(scene);
    }

    return () => {
      sceneReadyRef.current = false;
      pendingPresenceRef.current = null;
      pendingEventsRef.current = [];
      pendingChatBubblesRef.current = [];
      sceneRef.current = null;
      game.destroy(true);
      gameRef.current = null;
    };
  }, [currentUser, flushPendingSceneUpdates, onMoveRequest, room]);

  useEffect(() => {
    setPresenceWhenReady(presence);
  }, [presence, setPresenceWhenReady]);

  useImperativeHandle(ref, () => ({
    applyEvent(event: RoomServerEvent) {
      applyEventWhenReady(event);
    },
    setPresence(nextPresence: PresenceUser[]) {
      setPresenceWhenReady(nextPresence);
    },
    showChatBubble(userId: number, message: string) {
      showChatBubbleWhenReady(userId, message);
    },
    enterPlacementMode(item: InventoryItem) {
      sceneRef.current?.enterPlacementMode(
        item,
        onPlacementCancel,
        onPlacementConfirm ? (x, y, rotation) => onPlacementConfirm(item, x, y, rotation) : undefined,
      );
    },
    exitPlacementMode() {
      sceneRef.current?.exitPlacementMode();
    },
    setPlacementPending(pending: boolean) {
      sceneRef.current?.setPlacementPending(pending);
    },
    addFurnitureInstance(furniture: RoomFurniture) {
      sceneRef.current?.addFurnitureInstance(furniture);
    },
    removeFurnitureInstance(furnitureId: number) {
      sceneRef.current?.removeFurnitureInstance(furnitureId);
    },
    rotateFurnitureInstance(furnitureId: number, newRotation: string, newWidth: number, newHeight: number) {
      sceneRef.current?.rotateFurnitureInstance(furnitureId, newRotation, newWidth, newHeight);
    },
  }), [applyEventWhenReady, onPlacementCancel, onPlacementConfirm, setPresenceWhenReady, showChatBubbleWhenReady]);

  return <div aria-label={`${room.name} isometric room`} className="phaser-room" ref={containerRef} />;
});

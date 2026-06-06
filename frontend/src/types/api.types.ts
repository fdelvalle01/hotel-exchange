export interface User {
  id: number;
  username: string;
  displayName: string;
}

export interface RoomShell {
  wallMode: string;
  wallHeight: number;
  floorTheme: string;
  wallTheme: string;
}

export interface RoomModel {
  id: number;
  code: string;
  name: string;
  width: number;
  height: number;
  floorMap: string;
  wallMode: string;
  wallHeight: number;
  spawnX: number;
  spawnY: number;
  spawnDirection: string;
  theme: string;
}

export interface BlockedTile {
  x: number;
  y: number;
  reason: string;
}

export interface Room {
  id: number;
  name: string;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  spawnDirection?: string;
  modelCode?: string;
  shell?: RoomShell;
  model?: RoomModel;
  blockedTiles: BlockedTile[];
  furniture?: RoomFurniture[];
  onlineCount: number;
}

export interface RoomFurniture {
  id: number;
  catalogCode: string;
  name: string;
  spriteKey: string;
  spritePath: string;
  x: number;
  y: number;
  z: number;
  rotation: string;
  width: number;
  height: number;
  blocksMovement: boolean;
  interactionType: string;
  state: Record<string, unknown> | null;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface PublicStatusResponse {
  managersOnline: number;
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface Actor {
  id: number;
  username: string;
  displayName: string;
}

export interface PresenceUser {
  userId: number;
  username: string;
  displayName: string;
  x: number;
  y: number;
  direction: string;
  joinedAt: string;
}

export interface PresencePayload {
  users: PresenceUser[];
}

export interface ChatPayload {
  message: string;
}

export interface UserMovedPayload extends GridPosition {
  direction?: string;
  path?: GridPosition[];
}

export type AvatarMovementState = 'idle' | 'walking';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export type RoomEventType =
  | 'ROOM_JOIN'
  | 'ROOM_LEAVE'
  | 'USER_MOVED'
  | 'CHAT_MESSAGE'
  | 'PRESENCE_UPDATE'
  | 'ERROR';

export interface RoomServerEvent {
  type: RoomEventType;
  roomId: number | null;
  actor: Actor | null;
  payload: unknown;
  occurredAt: string;
}

export interface ChatLine {
  id: string;
  author: string;
  message: string;
  occurredAt: string;
  system?: boolean;
}

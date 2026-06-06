import type { GridPosition, Room, User } from '../../types/api.types';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface RoomCorners {
  north: ScreenPoint;
  east: ScreenPoint;
  south: ScreenPoint;
  west: ScreenPoint;
}

export interface RoomSceneOptions {
  room: Room;
  currentUser: User;
  onMoveRequest: (position: GridPosition) => void;
  onReady?: () => void;
  onFurniturePickUp?: (furnitureId: number, catalogCode: string, currentRotation: string, pctX: number, pctY: number) => void;
}

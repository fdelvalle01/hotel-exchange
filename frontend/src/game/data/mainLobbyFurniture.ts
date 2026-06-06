import type { GridPosition, Room, RoomFurniture } from '../../types/api.types';
import {
  FURNITURE_CATALOG_BY_ID,
  type FurnitureFallbackRenderType,
  type FurnitureRotation,
} from './furnitureCatalog';

export interface StaticFurnitureInstance {
  id: string;
  catalogId: string;
  x: number;
  y: number;
  rotation: FurnitureRotation;
  width?: number;
  height?: number;
  blocksMovement?: boolean;
  customDepthOffset?: number;
  /** DB primary key — present only for furniture loaded from room_furniture table */
  dbId?: number;
  /** User that placed this furniture; null = system decor, undefined = static/legacy */
  ownerUserId?: number | null;
}

export interface StaticCarpetDefinition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  blockingTiles: GridPosition[];
  renderType: 'iso-carpet';
}

export interface DrawableFallbackFurniture {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  blockingTiles: GridPosition[];
  renderType: FurnitureFallbackRenderType | 'iso-carpet';
}

const MAIN_LOBBY_ROOM_ID = 1;

export const MAIN_LOBBY_CARPET: StaticCarpetDefinition = {
  id: 'central-carpet',
  x: 3,
  y: 3,
  width: 6,
  height: 6,
  blockingTiles: [],
  renderType: 'iso-carpet',
};

export const MAIN_LOBBY_FURNITURE: StaticFurnitureInstance[] = [
  {
    id: 'manager-chair',
    catalogId: 'red_executive_chair',
    x: 8,
    y: 5,
    rotation: 'SE',
  },
  {
    id: 'waiting-sofa',
    catalogId: 'green_leather_sofa',
    x: 2,
    y: 6,
    rotation: 'SE',
  },
  {
    id: 'exchange-table',
    catalogId: 'dark_wood_coffee_table',
    x: 5,
    y: 7,
    rotation: 'SE',
  },
];

export function mainLobbyFurnitureInstances(room: Room) {
  // Always use server-provided furniture; static fallback is no longer used
  return (room.furniture ?? []).map(roomFurnitureToStaticInstance);
}

export function mainLobbyCarpets(room: Room) {
  return isMainLobby(room) ? [MAIN_LOBBY_CARPET] : [];
}

export function furnitureBlockedTiles(room: Room) {
  return mainLobbyFurnitureInstances(room).flatMap((instance) => (
    blockingTilesForInstance(instance).filter((tile) => isInsideRoom(tile, room))
  ));
}

export function carpetTiles(room: Room) {
  return mainLobbyCarpets(room).flatMap((carpet) => (
    rectangleTiles(carpet.x, carpet.y, carpet.width, carpet.height)
      .filter((tile) => isInsideRoom(tile, room))
  ));
}

export function fallbackFurnitureForInstance(instance: StaticFurnitureInstance): DrawableFallbackFurniture | null {
  const catalogItem = FURNITURE_CATALOG_BY_ID.get(instance.catalogId);
  if (!catalogItem) {
    return null;
  }

  return {
    id: instance.id,
    x: instance.x,
    y: instance.y,
    width: instance.width ?? catalogItem.width,
    height: instance.height ?? catalogItem.height,
    blockingTiles: blockingTilesForInstance(instance),
    renderType: catalogItem.fallbackRenderType,
  };
}

function blockingTilesForInstance(instance: StaticFurnitureInstance) {
  const catalogItem = FURNITURE_CATALOG_BY_ID.get(instance.catalogId);
  const blocksMovement = instance.blocksMovement ?? catalogItem?.blocksMovement ?? false;
  if (!blocksMovement) {
    return [];
  }

  return rectangleTiles(
    instance.x,
    instance.y,
    instance.width ?? catalogItem?.width ?? 1,
    instance.height ?? catalogItem?.height ?? 1,
  );
}

function rectangleTiles(x: number, y: number, width: number, height: number) {
  const tiles: GridPosition[] = [];
  for (let offsetY = 0; offsetY < height; offsetY += 1) {
    for (let offsetX = 0; offsetX < width; offsetX += 1) {
      tiles.push({ x: x + offsetX, y: y + offsetY });
    }
  }
  return tiles;
}

function isInsideRoom(position: GridPosition, room: Room) {
  return position.x >= 0
    && position.y >= 0
    && position.x < room.width
    && position.y < room.height;
}

function isMainLobby(room: Room) {
  return room.id === MAIN_LOBBY_ROOM_ID || room.name.toLowerCase() === 'main lobby';
}

function roomFurnitureToStaticInstance(furniture: RoomFurniture): StaticFurnitureInstance {
  return {
    id: `room-furniture-${furniture.id}`,
    catalogId: furniture.catalogCode,
    x: furniture.x,
    y: furniture.y,
    rotation: normalizeRotation(furniture.rotation),
    width: furniture.width,
    height: furniture.height,
    blocksMovement: furniture.blocksMovement,
    dbId: furniture.id,
    ownerUserId: furniture.ownerUserId ?? null,
  };
}

function normalizeRotation(rotation: string): FurnitureRotation {
  const normalized = rotation.toUpperCase();
  if (normalized === 'NE' || normalized === 'NW' || normalized === 'SE' || normalized === 'SW') {
    return normalized;
  }
  return 'SE';
}

import type { GridPosition, Room } from '../../types/api.types';
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
  customDepthOffset?: number;
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
    x: 7,
    y: 5,
    rotation: 'SE',
  },
  {
    id: 'waiting-sofa',
    catalogId: 'green_leather_sofa',
    x: 2,
    y: 7,
    rotation: 'SE',
  },
  {
    id: 'exchange-table',
    catalogId: 'dark_wood_coffee_table',
    x: 5,
    y: 6,
    rotation: 'SE',
  },
];

export function mainLobbyFurnitureInstances(room: Room) {
  return isMainLobby(room) ? MAIN_LOBBY_FURNITURE : [];
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
    width: catalogItem.width,
    height: catalogItem.height,
    blockingTiles: blockingTilesForInstance(instance),
    renderType: catalogItem.fallbackRenderType,
  };
}

function blockingTilesForInstance(instance: StaticFurnitureInstance) {
  const catalogItem = FURNITURE_CATALOG_BY_ID.get(instance.catalogId);
  if (!catalogItem?.blocksMovement) {
    return [];
  }

  return rectangleTiles(instance.x, instance.y, catalogItem.width, catalogItem.height);
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

import type { GridPosition } from '../../types/api.types';
import type { ScreenPoint } from '../types/game.types';

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export function gridToIso(
  x: number,
  y: number,
  origin: ScreenPoint,
  tileWidth = TILE_WIDTH,
  tileHeight = TILE_HEIGHT,
): ScreenPoint {
  return {
    x: origin.x + (x - y) * (tileWidth / 2),
    y: origin.y + (x + y) * (tileHeight / 2),
  };
}

export function isoToGrid(
  screenX: number,
  screenY: number,
  origin: ScreenPoint,
  tileWidth = TILE_WIDTH,
  tileHeight = TILE_HEIGHT,
): GridPosition {
  const localX = screenX - origin.x;
  const localY = screenY - origin.y;
  const halfTileWidth = tileWidth / 2;
  const halfTileHeight = tileHeight / 2;

  const projectedX = localX / halfTileWidth;
  const projectedY = localY / halfTileHeight;

  return {
    x: Math.floor((projectedY + projectedX) / 2 + 0.5),
    y: Math.floor((projectedY - projectedX) / 2 + 0.5),
  };
}

export function getTileCenter(
  x: number,
  y: number,
  origin: ScreenPoint,
  tileWidth = TILE_WIDTH,
  tileHeight = TILE_HEIGHT,
): ScreenPoint {
  return gridToIso(x, y, origin, tileWidth, tileHeight);
}

export function isPointInsideIsoTile(
  screenX: number,
  screenY: number,
  tileX: number,
  tileY: number,
  origin: ScreenPoint,
  tileWidth = TILE_WIDTH,
  tileHeight = TILE_HEIGHT,
) {
  const center = getTileCenter(tileX, tileY, origin, tileWidth, tileHeight);
  const normalizedX = Math.abs(screenX - center.x) / (tileWidth / 2);
  const normalizedY = Math.abs(screenY - center.y) / (tileHeight / 2);

  return normalizedX + normalizedY <= 1;
}

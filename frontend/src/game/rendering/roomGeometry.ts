import type { RoomTileView } from '../data/floorMapDecoder';
import type { RoomCorners, ScreenPoint } from '../types/game.types';
import { getTileCenter, TILE_HEIGHT, TILE_WIDTH } from '../utils/isometric';

export interface TileVertices {
  north: ScreenPoint;
  east: ScreenPoint;
  south: ScreenPoint;
  west: ScreenPoint;
}

export function getTileVertices(x: number, y: number, origin: ScreenPoint): TileVertices {
  const center = getTileCenter(x, y, origin);
  return {
    north: { x: center.x,                 y: center.y - TILE_HEIGHT / 2 },
    east:  { x: center.x + TILE_WIDTH / 2, y: center.y },
    south: { x: center.x,                 y: center.y + TILE_HEIGHT / 2 },
    west:  { x: center.x - TILE_WIDTH / 2, y: center.y },
  };
}

export type ExposedFace = 'NW' | 'NE' | 'SW' | 'SE';

export interface ExposedTileEdge {
  x: number;
  y: number;
  /**
   * NW = W→N edge: left back wall     — exposed when no tile at (x-1, y)
   * NE = N→E edge: right back wall    — exposed when no tile at (x, y-1)
   * SW = S→W edge: left platform side — exposed when no tile at (x, y+1)
   * SE = E→S edge: right platform side — exposed when no tile at (x+1, y)
   *
   * Adjacent tile vertices are shared for NW/SW (same x column) and NE/SE (same y row),
   * so per-tile rendering produces seamless faces along straight boundaries.
   */
  face: ExposedFace;
}

export function getExposedEdges(tiles: RoomTileView[]): ExposedTileEdge[] {
  const existing = new Set(tiles.filter((t) => t.exists).map((t) => `${t.x}:${t.y}`));
  const result: ExposedTileEdge[] = [];

  for (const tile of tiles) {
    if (!tile.exists) continue;
    const { x, y } = tile;

    if (!existing.has(`${x - 1}:${y}`)) result.push({ x, y, face: 'NW' });
    if (!existing.has(`${x}:${y - 1}`)) result.push({ x, y, face: 'NE' });
    if (!existing.has(`${x}:${y + 1}`)) result.push({ x, y, face: 'SW' });
    if (!existing.has(`${x + 1}:${y}`)) result.push({ x, y, face: 'SE' });
  }

  return result;
}

/**
 * Returns actual isometric room corners anchored to real tile vertices.
 * Uses iso extremes (min/max of x±y) instead of grid bounding-box indices,
 * so corners always land on an existing tile even for non-rectangular rooms.
 */
export function getRoomCorners(tiles: RoomTileView[], origin: ScreenPoint): RoomCorners {
  const existing = tiles.filter((t) => t.exists);
  if (existing.length === 0) {
    return { north: origin, east: origin, south: origin, west: origin };
  }

  const northTile = existing.reduce((a, b) => (a.x + a.y <= b.x + b.y ? a : b));
  const eastTile  = existing.reduce((a, b) => (a.x - a.y >= b.x - b.y ? a : b));
  const southTile = existing.reduce((a, b) => (a.x + a.y >= b.x + b.y ? a : b));
  const westTile  = existing.reduce((a, b) => (a.x - a.y <= b.x - b.y ? a : b));

  return {
    north: getTileVertices(northTile.x, northTile.y, origin).north,
    east:  getTileVertices(eastTile.x,  eastTile.y,  origin).east,
    south: getTileVertices(southTile.x, southTile.y, origin).south,
    west:  getTileVertices(westTile.x,  westTile.y,  origin).west,
  };
}

import Phaser from 'phaser';
import type { RoomCorners, ScreenPoint } from '../types/game.types';
import type { RoomTileView } from '../data/floorMapDecoder';
import { getTileVertices, getExposedEdges, getRoomCorners } from './roomGeometry';

export interface RoomShellConfig {
  wallMode: string;
  wallHeightPx: number;
  sideDepthPx: number;
}

/**
 * Computes the four extreme isometric corners of the room from actual tile vertices.
 * Returns corners anchored to real existing tiles (not bounding-box grid indices).
 */
export function calculateCorners(
  decodedTiles: RoomTileView[] | null,
  width: number,
  height: number,
  origin: ScreenPoint,
): RoomCorners {
  const tiles = decodedTiles ?? rectangularFallback(width, height);
  return getRoomCorners(tiles, origin);
}

/**
 * Renders room walls and platform sides by drawing one quad per exposed tile edge.
 * For rectangular rooms the quads are seamlessly adjacent (shared vertices).
 * For non-rectangular rooms the quads follow the actual room outline so walls
 * and platform sides never appear above or below void tiles.
 */
export function renderRoomShell(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  decodedTiles: RoomTileView[] | null,
  width: number,
  height: number,
  origin: ScreenPoint,
  config: RoomShellConfig,
): void {
  if (config.wallMode === 'OPEN') return;

  const tiles = decodedTiles ?? rectangularFallback(width, height);
  const edges = getExposedEdges(tiles);
  const { wallHeightPx, sideDepthPx } = config;
  const objects: Phaser.GameObjects.Graphics[] = [];

  for (const edge of edges) {
    const v = getTileVertices(edge.x, edge.y, origin);

    switch (edge.face) {
      case 'NW':
        // Left back wall: W→N edge extruded upward
        objects.push(drawQuad(scene,
          v.west, v.north,
          { x: v.north.x, y: v.north.y - wallHeightPx },
          { x: v.west.x,  y: v.west.y  - wallHeightPx },
          0x7a6253, 0.96, 0x241a17, 0.42));
        // Baseboard accent strip
        objects.push(drawQuad(scene,
          v.west, v.north,
          { x: v.north.x, y: v.north.y - 10 },
          { x: v.west.x,  y: v.west.y  - 10 },
          0x3b261f, 0.96));
        break;

      case 'NE':
        // Right back wall: N→E edge extruded upward
        objects.push(drawQuad(scene,
          v.north, v.east,
          { x: v.east.x,  y: v.east.y  - wallHeightPx },
          { x: v.north.x, y: v.north.y - wallHeightPx },
          0x8b705d, 0.96, 0x241a17, 0.42));
        objects.push(drawQuad(scene,
          v.north, v.east,
          { x: v.east.x,  y: v.east.y  - 10 },
          { x: v.north.x, y: v.north.y - 10 },
          0x4a2f25, 0.96));
        break;

      case 'SW':
        // Left platform side: S→W edge extruded downward
        objects.push(drawQuad(scene,
          v.south, v.west,
          { x: v.west.x,  y: v.west.y  + sideDepthPx },
          { x: v.south.x, y: v.south.y + sideDepthPx },
          0x172723, 1, 0x0b1312, 0.8));
        break;

      case 'SE':
        // Right platform side: E→S edge extruded downward
        objects.push(drawQuad(scene,
          v.east, v.south,
          { x: v.south.x, y: v.south.y + sideDepthPx },
          { x: v.east.x,  y: v.east.y  + sideDepthPx },
          0x1f302b, 1, 0x0b1312, 0.8));
        break;
    }
  }

  layer.add(objects);
}

function rectangularFallback(width: number, height: number): RoomTileView[] {
  const tiles: RoomTileView[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({ x, y, exists: true, walkable: true, height: 0, raw: '0' });
    }
  }
  return tiles;
}

function drawQuad(
  scene: Phaser.Scene,
  a: ScreenPoint,
  b: ScreenPoint,
  c: ScreenPoint,
  d: ScreenPoint,
  fill: number,
  alpha: number,
  stroke?: number,
  strokeAlpha = 1,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.lineTo(c.x, c.y);
  g.lineTo(d.x, d.y);
  g.closePath();
  g.fillPath();
  if (stroke !== undefined) {
    g.lineStyle(1, stroke, strokeAlpha);
    g.strokePath();
  }
  return g;
}

import Phaser from 'phaser';
import type { RoomCorners, ScreenPoint } from '../types/game.types';
import type { RoomTileView } from '../data/floorMapDecoder';
import { getTileCenter, TILE_HEIGHT, TILE_WIDTH } from '../utils/isometric';

export interface RoomShellConfig {
  wallMode: string;
  wallHeightPx: number;
  sideDepthPx: number;
}

export function calculateCorners(
  decodedTiles: RoomTileView[] | null,
  width: number,
  height: number,
  origin: ScreenPoint,
): RoomCorners {
  let minX = 0;
  let maxX = width - 1;
  let minY = 0;
  let maxY = height - 1;

  const existingTiles = decodedTiles?.filter((t) => t.exists);
  if (existingTiles && existingTiles.length > 0) {
    minX = Math.min(...existingTiles.map((t) => t.x));
    maxX = Math.max(...existingTiles.map((t) => t.x));
    minY = Math.min(...existingTiles.map((t) => t.y));
    maxY = Math.max(...existingTiles.map((t) => t.y));
  }

  const northCenter = getTileCenter(minX, minY, origin);
  const eastCenter = getTileCenter(maxX, minY, origin);
  const southCenter = getTileCenter(maxX, maxY, origin);
  const westCenter = getTileCenter(minX, maxY, origin);

  return {
    north: { x: northCenter.x, y: northCenter.y - TILE_HEIGHT / 2 },
    east: { x: eastCenter.x + TILE_WIDTH / 2, y: eastCenter.y },
    south: { x: southCenter.x, y: southCenter.y + TILE_HEIGHT / 2 },
    west: { x: westCenter.x - TILE_WIDTH / 2, y: westCenter.y },
  };
}

export function renderRoomShell(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  corners: RoomCorners,
  config: RoomShellConfig,
): void {
  if (config.wallMode === 'OPEN') {
    return;
  }

  const { wallHeightPx, sideDepthPx } = config;

  const objects: Phaser.GameObjects.Graphics[] = [
    drawPolygon(scene, [
      corners.north,
      corners.west,
      { x: corners.west.x, y: corners.west.y - wallHeightPx },
      { x: corners.north.x, y: corners.north.y - wallHeightPx },
    ], 0x7a6253, 0.96, 0x241a17, 0.42),

    drawPolygon(scene, [
      corners.north,
      corners.east,
      { x: corners.east.x, y: corners.east.y - wallHeightPx },
      { x: corners.north.x, y: corners.north.y - wallHeightPx },
    ], 0x8b705d, 0.96, 0x241a17, 0.42),

    drawPolygon(scene, [
      corners.north,
      corners.west,
      { x: corners.west.x, y: corners.west.y - 10 },
      { x: corners.north.x, y: corners.north.y - 10 },
    ], 0x3b261f, 0.96),

    drawPolygon(scene, [
      corners.north,
      corners.east,
      { x: corners.east.x, y: corners.east.y - 10 },
      { x: corners.north.x, y: corners.north.y - 10 },
    ], 0x4a2f25, 0.96),

    drawPolygon(scene, [
      corners.west,
      corners.south,
      { x: corners.south.x, y: corners.south.y + sideDepthPx },
      { x: corners.west.x, y: corners.west.y + sideDepthPx },
    ], 0x172723, 1, 0x0b1312, 0.8),

    drawPolygon(scene, [
      corners.south,
      corners.east,
      { x: corners.east.x, y: corners.east.y + sideDepthPx },
      { x: corners.south.x, y: corners.south.y + sideDepthPx },
    ], 0x1f302b, 1, 0x0b1312, 0.8),
  ];

  layer.add(objects);
}

function drawPolygon(
  scene: Phaser.Scene,
  points: ScreenPoint[],
  fill: number,
  alpha: number,
  stroke?: number,
  strokeAlpha = 1,
): Phaser.GameObjects.Graphics {
  const graphic = scene.add.graphics();
  graphic.fillStyle(fill, alpha);
  graphic.beginPath();
  graphic.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    graphic.lineTo(point.x, point.y);
  }
  graphic.closePath();
  graphic.fillPath();
  if (stroke !== undefined) {
    graphic.lineStyle(1, stroke, strokeAlpha);
    graphic.strokePath();
  }
  return graphic;
}

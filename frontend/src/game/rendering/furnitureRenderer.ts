import Phaser from 'phaser';
import type { ScreenPoint } from '../types/game.types';
import { getTileCenter, TILE_HEIGHT, TILE_WIDTH } from '../utils/isometric';
import type { DrawableFallbackFurniture } from '../data/mainLobbyFurniture';

type FurnitureLayer = 'floor' | 'world';

interface RenderedFurniture {
  container: Phaser.GameObjects.Container;
  layer: FurnitureLayer;
}

const OUTLINE = 0x140d09;
const SHADOW = 0x000000;

export function renderFurniture(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  switch (item.renderType) {
    case 'iso-carpet':
      return renderCarpet(scene, item, origin);
    case 'iso-reception':
      return renderReceptionDesk(scene, item, origin);
    case 'iso-bench':
      return renderBench(scene, item, origin);
    case 'iso-plant':
      return renderPlant(scene, item, origin);
    case 'iso-lamp':
      return renderLamp(scene, item, origin);
    case 'iso-door':
      return renderDoor(scene, item, origin);
    case 'iso-chair':
      return renderChair(scene, item, origin);
    case 'iso-table':
      return renderCoffeeTable(scene, item, origin);
    case 'iso-sofa':
      return renderSofa(scene, item, origin);
    case 'iso-market-screen':
      return renderMarketScreen(scene, item, origin);
    case 'iso-wall-sign':
      return renderWallSign(scene, item, origin);
    case 'iso-rug':
      return renderRug(scene, item, origin);
  }
}

export function furnitureDepth(item: DrawableFallbackFurniture, origin: ScreenPoint) {
  const baseTiles = item.blockingTiles.length > 0
    ? item.blockingTiles
    : [{ x: item.x + item.width - 1, y: item.y + item.height - 1 }];

  return Math.max(
    ...baseTiles.map((tile) => getTileCenter(tile.x, tile.y, origin).y),
  ) + TILE_HEIGHT;
}

export function drawFurnitureShadow(
  scene: Phaser.Scene,
  width: number,
  height: number,
  y = 0,
) {
  return polygon(scene, 0, y, [
    0,
    -height / 2,
    width / 2,
    0,
    0,
    height / 2,
    -width / 2,
    0,
  ], SHADOW, 0.22, undefined, 0);
}

export function drawIsoBox(
  scene: Phaser.Scene,
  width: number,
  depth: number,
  height: number,
  colors: {
    top: number;
    left: number;
    right: number;
    front?: number;
  },
) {
  const top = [
    0,
    -height - depth / 2,
    width / 2,
    -height,
    0,
    -height + depth / 2,
    -width / 2,
    -height,
  ];
  const leftFace = [
    -width / 2,
    -height,
    0,
    -height + depth / 2,
    0,
    depth / 2,
    -width / 2,
    0,
  ];
  const rightFace = [
    width / 2,
    -height,
    0,
    -height + depth / 2,
    0,
    depth / 2,
    width / 2,
    0,
  ];
  const frontFace = [
    -width / 2,
    0,
    0,
    depth / 2,
    width / 2,
    0,
    width / 2,
    8,
    0,
    depth / 2 + 8,
    -width / 2,
    8,
  ];

  return [
    polygon(scene, 0, 0, leftFace, colors.left),
    polygon(scene, 0, 0, rightFace, colors.right),
    ...(colors.front ? [polygon(scene, 0, 0, frontFace, colors.front)] : []),
    polygon(scene, 0, 0, top, colors.top),
  ];
}

export function drawCarpet(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
) {
  const children: Phaser.GameObjects.GameObject[] = [];
  for (let y = 0; y < item.height; y += 1) {
    for (let x = 0; x < item.width; x += 1) {
      const local = tileOffset(x, y);
      const color = (x + y) % 2 === 0 ? 0x8d3c32 : 0x743028;
      children.push(polygon(scene, local.x, local.y, diamondPoints(), color, 0.92, 0x5a211c, 0.82, 1));
    }
  }

  for (const edge of carpetEdgeTiles(item)) {
    const local = tileOffset(edge.x, edge.y);
    children.push(polygon(scene, local.x, local.y, diamondPoints(0.76), 0xd8a23d, 0.2, 0xd8a23d, 0.42, 1));
  }

  return children;
}

export function drawReceptionDesk(scene: Phaser.Scene) {
  const children: Phaser.GameObjects.GameObject[] = [
    drawFurnitureShadow(scene, 148, 44, 8),
    ...drawIsoBox(scene, 142, 52, 34, {
      top: 0xd89b55,
      left: 0x7a4429,
      right: 0x9a5730,
      front: 0x5b321f,
    }),
  ];

  children.push(...drawIsoBox(scene, 42, 22, 12, {
    top: 0xffe2a3,
    left: 0x9b6d3c,
    right: 0xb27c45,
  }).map((child) => moveChild(child, -8, -34)));

  children.push(rect(scene, -18, -54, 36, 5, 0x140d09));
  children.push(rect(scene, -14, -61, 28, 16, 0x23364c, OUTLINE));
  children.push(rect(scene, -10, -57, 20, 8, 0x47a8e6));
  children.push(rect(scene, 34, -40, 22, 8, 0xfff3b0, OUTLINE));
  children.push(rect(scene, 38, -43, 14, 3, 0xd8a23d));

  return children;
}

export function drawBench(scene: Phaser.Scene) {
  const children: Phaser.GameObjects.GameObject[] = [
    drawFurnitureShadow(scene, 112, 34, 8),
    ...drawIsoBox(scene, 104, 30, 12, {
      top: 0xb66d3a,
      left: 0x6d3f28,
      right: 0x8d512f,
      front: 0x4b2d1f,
    }),
  ];

  children.push(...drawIsoBox(scene, 96, 20, 12, {
    top: 0xd08648,
    left: 0x6d3f28,
    right: 0x8d512f,
  }).map((child) => moveChild(child, 0, -22)));
  children.push(rect(scene, -39, 2, 7, 18, 0x3b2618, OUTLINE));
  children.push(rect(scene, 32, 2, 7, 18, 0x3b2618, OUTLINE));

  return children;
}

export function drawChair(scene: Phaser.Scene) {
  const children: Phaser.GameObjects.GameObject[] = [
    drawFurnitureShadow(scene, 72, 32, 8),
    ...drawIsoBox(scene, 64, 34, 16, {
      top: 0xd62f3d,
      left: 0x7d1c27,
      right: 0xa12430,
      front: 0x58151d,
    }),
  ];

  children.push(rect(scene, -30, -72, 60, 60, OUTLINE));
  children.push(rect(scene, -25, -67, 50, 50, 0xc72433));
  children.push(rect(scene, -18, -60, 36, 9, 0xf05463));
  children.push(rect(scene, -40, -28, 12, 36, 0x2f3034, OUTLINE));
  children.push(rect(scene, 28, -28, 12, 36, 0x2f3034, OUTLINE));
  children.push(rect(scene, -34, -40, 24, 9, 0xe74655, OUTLINE));
  children.push(rect(scene, 10, -40, 24, 9, 0xe74655, OUTLINE));
  children.push(rect(scene, -4, 4, 8, 24, 0x2f3034, OUTLINE));
  children.push(rect(scene, -30, 27, 60, 6, 0x2f3034, OUTLINE));

  return children;
}

export function drawCoffeeTable(scene: Phaser.Scene) {
  const children: Phaser.GameObjects.GameObject[] = [
    drawFurnitureShadow(scene, 118, 38, 8),
    ...drawIsoBox(scene, 108, 46, 16, {
      top: 0x724238,
      left: 0x3a2020,
      right: 0x51292a,
      front: 0x2a1718,
    }),
  ];

  children.push(rect(scene, -38, 0, 8, 24, 0x2c1715, OUTLINE));
  children.push(rect(scene, 30, 0, 8, 24, 0x2c1715, OUTLINE));
  children.push(rect(scene, -8, 13, 8, 24, 0x2c1715, OUTLINE));
  children.push(rect(scene, 39, -10, 8, 21, 0x2c1715, OUTLINE));
  children.push(rect(scene, -18, -30, 34, 5, 0xa46957));
  children.push(rect(scene, 14, -24, 12, 4, 0x8d5a4d));

  return children;
}

export function drawSofa(scene: Phaser.Scene) {
  const children: Phaser.GameObjects.GameObject[] = [
    drawFurnitureShadow(scene, 142, 42, 8),
    ...drawIsoBox(scene, 132, 42, 18, {
      top: 0x46b768,
      left: 0x1d663e,
      right: 0x2f8b52,
      front: 0x18482f,
    }),
  ];

  children.push(rect(scene, -64, -67, 128, 48, OUTLINE));
  children.push(rect(scene, -59, -62, 118, 38, 0x319554));
  children.push(rect(scene, -46, -56, 23, 29, 0x45b968, OUTLINE));
  children.push(rect(scene, -17, -56, 23, 29, 0x45b968, OUTLINE));
  children.push(rect(scene, 12, -56, 23, 29, 0x45b968, OUTLINE));
  children.push(rect(scene, 41, -56, 23, 29, 0x45b968, OUTLINE));
  children.push(rect(scene, -70, -37, 18, 46, 0x2a8148, OUTLINE));
  children.push(rect(scene, 52, -37, 18, 46, 0x2a8148, OUTLINE));
  children.push(rect(scene, -50, -24, 32, 16, 0x56c978, OUTLINE));
  children.push(rect(scene, -12, -24, 32, 16, 0x56c978, OUTLINE));
  children.push(rect(scene, 26, -24, 32, 16, 0x56c978, OUTLINE));

  return children;
}

export function drawPlant(scene: Phaser.Scene) {
  const children: Phaser.GameObjects.GameObject[] = [
    drawFurnitureShadow(scene, 44, 24, 6),
    ...drawIsoBox(scene, 36, 22, 18, {
      top: 0x9a5c39,
      left: 0x5b3527,
      right: 0x7a4930,
    }),
  ];

  const leaves = [
    { x: -15, y: -44, w: 18, h: 18, c: 0x2f7449 },
    { x: 0, y: -54, w: 22, h: 22, c: 0x62a76f },
    { x: 13, y: -42, w: 17, h: 17, c: 0x2f7449 },
    { x: -6, y: -67, w: 18, h: 18, c: 0x79bd70 },
    { x: -24, y: -34, w: 15, h: 15, c: 0x62a76f },
  ];
  for (const leaf of leaves) {
    children.push(rect(scene, leaf.x, leaf.y, leaf.w, leaf.h, OUTLINE));
    children.push(rect(scene, leaf.x + 2, leaf.y + 2, leaf.w - 4, leaf.h - 4, leaf.c));
  }

  return children;
}

export function drawLamp(scene: Phaser.Scene) {
  const children: Phaser.GameObjects.GameObject[] = [
    drawFurnitureShadow(scene, 36, 18, 5),
    polygon(scene, 0, -50, [
      0,
      -22,
      28,
      -6,
      18,
      14,
      -18,
      14,
      -28,
      -6,
    ], 0xffe675, 0.12, undefined, 0),
    ...drawIsoBox(scene, 30, 16, 6, {
      top: 0x4b443c,
      left: 0x201915,
      right: 0x302720,
    }),
    rect(scene, -3, -48, 6, 46, 0x2f2d2a, OUTLINE),
    rect(scene, -16, -62, 32, 16, OUTLINE),
    rect(scene, -13, -59, 26, 10, 0xffd94e),
    rect(scene, -9, -56, 18, 4, 0xfff3b0),
  ];

  return children;
}

export function drawMarketScreen(scene: Phaser.Scene) {
  const children: Phaser.GameObjects.GameObject[] = [
    drawFurnitureShadow(scene, 80, 18, 8),
    rect(scene, -58, -76, 116, 40, OUTLINE),
    rect(scene, -54, -72, 108, 32, 0x121916),
    rect(scene, -48, -66, 96, 1, 0x2f8b52),
    rect(scene, -48, -45, 96, 1, 0x2f8b52),
    label(scene, 0, -61, 'MARKET OPEN', '10px', '#8cff9c'),
    label(scene, 0, -49, 'BTC +2.4  SPY +0.8', '8px', '#ffd94e'),
  ];

  return children;
}

export function drawWallSign(scene: Phaser.Scene) {
  const children: Phaser.GameObjects.GameObject[] = [
    drawFurnitureShadow(scene, 94, 18, 8),
    rect(scene, -62, -68, 124, 32, OUTLINE),
    rect(scene, -58, -64, 116, 24, 0x241a17),
    rect(scene, -52, -58, 104, 12, 0x3b261f),
    label(scene, 0, -52, 'EXCHANGE DESK', '10px', '#fff1cf'),
    rect(scene, -50, -39, 100, 2, 0xd8a23d),
  ];

  return children;
}

export function drawCenteredRug(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
) {
  const children: Phaser.GameObjects.GameObject[] = [];
  const center = tileOffset((item.width - 1) / 2, (item.height - 1) / 2);

  for (let y = 0; y < item.height; y += 1) {
    for (let x = 0; x < item.width; x += 1) {
      const local = tileOffset(x, y);
      const color = (x + y) % 2 === 0 ? 0x8d3c32 : 0x743028;
      children.push(polygon(
        scene,
        local.x - center.x,
        local.y - center.y,
        diamondPoints(),
        color,
        0.82,
        0x5a211c,
        0.7,
        1,
      ));
    }
  }

  for (const edge of carpetEdgeTiles(item)) {
    const local = tileOffset(edge.x, edge.y);
    children.push(polygon(
      scene,
      local.x - center.x,
      local.y - center.y,
      diamondPoints(0.76),
      0xd8a23d,
      0.16,
      0xd8a23d,
      0.38,
      1,
    ));
  }

  children.push(label(scene, 0, 0, 'HX', '11px', '#fff1cf'));

  return children;
}

export function drawDoor(scene: Phaser.Scene) {
  const children: Phaser.GameObjects.GameObject[] = [
    drawFurnitureShadow(scene, 70, 24, 8),
    ...drawIsoBox(scene, 72, 24, 12, {
      top: 0x7a5147,
      left: 0x3b2618,
      right: 0x5b321f,
    }),
    rect(scene, -31, -72, 62, 70, OUTLINE),
    rect(scene, -26, -67, 52, 65, 0x7a5147),
    rect(scene, -20, -57, 40, 55, 0x3b2618),
    rect(scene, -15, -52, 13, 20, 0x5b321f),
    rect(scene, 2, -52, 13, 20, 0x5b321f),
    rect(scene, 12, -28, 5, 5, 0xd8a23d),
  ];

  return children;
}

function renderCarpet(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  const center = getTileCenter(item.x, item.y, origin);
  const container = scene.add.container(center.x, center.y, drawCarpet(scene, item));
  container.setDepth(center.y - TILE_HEIGHT);
  return { container, layer: 'floor' };
}

function renderReceptionDesk(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  return renderWorldItem(scene, item, origin, drawReceptionDesk(scene));
}

function renderBench(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  return renderWorldItem(scene, item, origin, drawBench(scene));
}

function renderChair(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  return renderWorldItem(scene, item, origin, drawChair(scene));
}

function renderCoffeeTable(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  return renderWorldItem(scene, item, origin, drawCoffeeTable(scene));
}

function renderSofa(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  return renderWorldItem(scene, item, origin, drawSofa(scene));
}

function renderPlant(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  return renderWorldItem(scene, item, origin, drawPlant(scene));
}

function renderLamp(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  return renderWorldItem(scene, item, origin, drawLamp(scene));
}

function renderMarketScreen(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  return renderWorldItem(scene, item, origin, drawMarketScreen(scene));
}

function renderWallSign(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  return renderWorldItem(scene, item, origin, drawWallSign(scene));
}

function renderRug(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  const center = getTileCenter(item.x, item.y, origin);
  const container = scene.add.container(center.x, center.y, drawCenteredRug(scene, item));
  container.setDepth(center.y - TILE_HEIGHT);
  return { container, layer: 'floor' };
}

function renderDoor(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
): RenderedFurniture {
  return renderWorldItem(scene, item, origin, drawDoor(scene));
}

function renderWorldItem(
  scene: Phaser.Scene,
  item: DrawableFallbackFurniture,
  origin: ScreenPoint,
  children: Phaser.GameObjects.GameObject[],
): RenderedFurniture {
  const center = getTileCenter(item.x, item.y, origin);
  const container = scene.add.container(center.x, center.y, children);
  container.setDepth(furnitureDepth(item, origin));
  return { container, layer: 'world' };
}

function polygon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  points: number[],
  fill: number,
  alpha = 1,
  stroke: number | undefined = OUTLINE,
  strokeAlpha = 1,
  strokeWidth = 2,
) {
  const bounds = polygonBounds(points);
  const object = scene.add.polygon(
    x + bounds.width / 2,
    y + bounds.height / 2,
    points,
    fill,
    alpha,
  );
  if (stroke !== undefined && strokeWidth > 0) {
    object.setStrokeStyle(strokeWidth, stroke, strokeAlpha);
  }
  return object;
}

function rect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: number,
  stroke?: number,
) {
  const object = scene.add.rectangle(x, y, width, height, fill, 1);
  if (stroke !== undefined) {
    object.setStrokeStyle(2, stroke, 1);
  }
  return object;
}

function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  fontSize: string,
  color: string,
) {
  const object = scene.add.text(x, y, value, {
    align: 'center',
    color,
    fontFamily: 'Courier New, Lucida Console, monospace',
    fontSize,
    fontStyle: 'bold',
  });
  object.setOrigin(0.5);
  return object;
}

function moveChild<T extends Phaser.GameObjects.GameObject>(child: T, x: number, y: number) {
  const positioned = child as T & { x: number; y: number };
  positioned.x += x;
  positioned.y += y;
  return child;
}

function polygonBounds(points: number[]) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < points.length; index += 2) {
    const x = points[index];
    const y = points[index + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
  };
}

function diamondPoints(scale = 1) {
  return [
    0,
    (-TILE_HEIGHT / 2) * scale,
    (TILE_WIDTH / 2) * scale,
    0,
    0,
    (TILE_HEIGHT / 2) * scale,
    (-TILE_WIDTH / 2) * scale,
    0,
  ];
}

function tileOffset(x: number, y: number) {
  return {
    x: (x - y) * (TILE_WIDTH / 2),
    y: (x + y) * (TILE_HEIGHT / 2),
  };
}

function carpetEdgeTiles(item: DrawableFallbackFurniture) {
  const tiles: Array<{ x: number; y: number }> = [];
  for (let x = 0; x < item.width; x += 1) {
    tiles.push({ x, y: 0 });
    tiles.push({ x, y: item.height - 1 });
  }
  for (let y = 1; y < item.height - 1; y += 1) {
    tiles.push({ x: 0, y });
    tiles.push({ x: item.width - 1, y });
  }
  return tiles;
}

import Phaser from 'phaser';
import type { GridPosition } from '../../types/api.types';
import type { ScreenPoint } from '../types/game.types';
import type { FurnitureCatalogItem } from '../data/furnitureCatalog';
import {
  fallbackFurnitureForInstance,
  type StaticFurnitureInstance,
} from '../data/mainLobbyFurniture';
import { TILE_HEIGHT, TILE_WIDTH } from '../utils/isometric';
import { renderFurniture } from './furnitureRenderer';

type FurnitureCatalog = ReadonlyMap<string, FurnitureCatalogItem>;
type GridToIso = (x: number, y: number) => ScreenPoint;

interface FurnitureRenderGeometry {
  footprintWidth: number;
  footprintHeight: number;
  footprintTiles: GridPosition[];
  baseTileX: number;
  baseTileY: number;
  anchorGridX: number;
  anchorGridY: number;
  renderOffsetX: number;
  renderOffsetY: number;
}

interface RenderedFurnitureObject {
  id: string;
  object: Phaser.GameObjects.GameObject;
  catalogItem: FurnitureCatalogItem;
  usedFallback: boolean;
}

const failedSpriteKeys = new Set<string>();
const warnedSpriteKeys = new Set<string>();

export function preloadFurnitureSprites(
  scene: Phaser.Scene,
  furnitureInstances: StaticFurnitureInstance[],
  catalog: FurnitureCatalog,
) {
  const spriteKeys = new Set<string>();

  for (const instance of furnitureInstances) {
    const catalogItem = catalog.get(instance.catalogId);
    if (!catalogItem || spriteKeys.has(catalogItem.spriteKey) || scene.textures.exists(catalogItem.spriteKey)) {
      continue;
    }

    spriteKeys.add(catalogItem.spriteKey);
    scene.load.image(catalogItem.spriteKey, catalogItem.spritePath);
  }

  if (spriteKeys.size === 0) {
    return;
  }

  const handleLoadError = (file: { key?: string; src?: string }) => {
    if (!file.key || !spriteKeys.has(file.key)) {
      return;
    }

    failedSpriteKeys.add(file.key);
    warnMissingSprite(file.key, file.src ?? 'unknown path');
  };

  scene.load.on('loaderror', handleLoadError);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    scene.load.off('loaderror', handleLoadError);
  });
}

export function renderFurnitureSprites(
  scene: Phaser.Scene,
  furnitureInstances: StaticFurnitureInstance[],
  catalog: FurnitureCatalog,
  gridToIso: GridToIso,
): RenderedFurnitureObject[] {
  const renderedObjects: RenderedFurnitureObject[] = [];

  for (const instance of furnitureInstances) {
    const catalogItem = catalog.get(instance.catalogId);
    if (!catalogItem) {
      if (import.meta.env.DEV) {
        console.warn(`[RoomScene] Missing furniture catalog item "${instance.catalogId}"`);
      }
      continue;
    }

    const geometry = furnitureRenderGeometry(instance, catalogItem);
    const screenPoint = spriteAnchorPoint(geometry, gridToIso);
    const depth = spriteDepth(geometry, catalogItem, instance, gridToIso);

    if (scene.textures.exists(catalogItem.spriteKey) && !failedSpriteKeys.has(catalogItem.spriteKey)) {
      const sprite = scene.add.image(screenPoint.x, screenPoint.y, catalogItem.spriteKey);
      sprite.setOrigin(catalogItem.originX, catalogItem.originY);
      sprite.setScale(catalogItem.scale ?? 1);
      sprite.setDepth(depth);
      renderedObjects.push({
        id: instance.id,
        object: sprite,
        catalogItem,
        usedFallback: false,
      });
    } else {
      warnMissingSprite(catalogItem.spriteKey, catalogItem.spritePath);
      const fallback = fallbackFurnitureForInstance(instance);
      if (fallback) {
        const fallbackRender = renderFurniture(scene, fallback, { x: 0, y: 0 });
        fallbackRender.container.setPosition(screenPoint.x, screenPoint.y);
        fallbackRender.container.setDepth(depth);
        renderedObjects.push({
          id: instance.id,
          object: fallbackRender.container,
          catalogItem,
          usedFallback: true,
        });
      }
    }

    if (isFurnitureDepthDebugEnabled()) {
      renderedObjects.push({
        id: `${instance.id}-depth-debug`,
        object: renderFurnitureDepthDebug(scene, instance, geometry, depth, gridToIso),
        catalogItem,
        usedFallback: false,
      });
    }
  }

  return renderedObjects;
}

function furnitureRenderGeometry(
  instance: StaticFurnitureInstance,
  catalogItem: FurnitureCatalogItem,
): FurnitureRenderGeometry {
  const footprintWidth = instance.width ?? catalogItem.width;
  const footprintHeight = instance.height ?? catalogItem.height;
  const footprintTiles = furnitureFootprintTiles(instance, footprintWidth, footprintHeight);

  return {
    footprintWidth,
    footprintHeight,
    footprintTiles,
    baseTileX: instance.x + footprintWidth - 1,
    baseTileY: instance.y + footprintHeight - 1,
    anchorGridX: instance.x + (catalogItem.anchorOffsetX ?? (footprintWidth - 1) / 2),
    anchorGridY: instance.y + (catalogItem.anchorOffsetY ?? (footprintHeight - 1) / 2),
    renderOffsetX: catalogItem.renderOffsetX ?? 0,
    renderOffsetY: catalogItem.renderOffsetY ?? 0,
  };
}

function spriteDepth(
  geometry: FurnitureRenderGeometry,
  catalogItem: FurnitureCatalogItem,
  instance: StaticFurnitureInstance,
  gridToIso: GridToIso,
) {
  const maxDepthTile = frontMostFootprintTile(geometry, gridToIso);
  const basePoint = gridToIso(maxDepthTile.x, maxDepthTile.y);

  return basePoint.y + (catalogItem.depthOffset ?? 0) + (instance.customDepthOffset ?? 0);
}

function spriteAnchorPoint(
  geometry: FurnitureRenderGeometry,
  gridToIso: GridToIso,
) {
  const anchorPoint = gridToIso(geometry.anchorGridX, geometry.anchorGridY);
  return {
    x: anchorPoint.x + geometry.renderOffsetX,
    y: anchorPoint.y + geometry.renderOffsetY,
  };
}

function furnitureFootprintTiles(
  instance: StaticFurnitureInstance,
  footprintWidth: number,
  footprintHeight: number,
) {
  const tiles: GridPosition[] = [];
  for (let offsetY = 0; offsetY < footprintHeight; offsetY += 1) {
    for (let offsetX = 0; offsetX < footprintWidth; offsetX += 1) {
      tiles.push({
        x: instance.x + offsetX,
        y: instance.y + offsetY,
      });
    }
  }
  return tiles;
}

function frontMostFootprintTile(
  geometry: FurnitureRenderGeometry,
  gridToIso: GridToIso,
) {
  return geometry.footprintTiles.reduce((frontMost, tile) => {
    const frontMostPoint = gridToIso(frontMost.x, frontMost.y);
    const tilePoint = gridToIso(tile.x, tile.y);

    if (tilePoint.y !== frontMostPoint.y) {
      return tilePoint.y > frontMostPoint.y ? tile : frontMost;
    }

    return tilePoint.x > frontMostPoint.x ? tile : frontMost;
  });
}

function renderFurnitureDepthDebug(
  scene: Phaser.Scene,
  instance: StaticFurnitureInstance,
  geometry: FurnitureRenderGeometry,
  depth: number,
  gridToIso: GridToIso,
) {
  const graphics = scene.add.graphics();
  const anchorPoint = gridToIso(geometry.anchorGridX, geometry.anchorGridY);
  const renderAnchorPoint = spriteAnchorPoint(geometry, gridToIso);
  const maxDepthTile = frontMostFootprintTile(geometry, gridToIso);
  const maxDepthPoint = gridToIso(maxDepthTile.x, maxDepthTile.y);

  for (const tile of geometry.footprintTiles) {
    drawDebugDiamond(graphics, gridToIso(tile.x, tile.y), 0xff66d8, 0.78);
  }

  drawDebugDiamond(graphics, gridToIso(geometry.baseTileX, geometry.baseTileY), 0xffffff, 0.68);
  drawDebugDiamond(graphics, maxDepthPoint, 0x3fb6ff, 0.95);

  graphics.lineStyle(1, 0xffd94e, 0.9);
  graphics.lineBetween(anchorPoint.x - 6, anchorPoint.y, anchorPoint.x + 6, anchorPoint.y);
  graphics.lineBetween(anchorPoint.x, anchorPoint.y - 6, anchorPoint.x, anchorPoint.y + 6);
  graphics.fillStyle(0xffd94e, 0.95);
  graphics.fillCircle(renderAnchorPoint.x, renderAnchorPoint.y, 4);
  graphics.fillStyle(0x3fb6ff, 0.95);
  graphics.fillCircle(maxDepthPoint.x, maxDepthPoint.y, 4);

  const label = scene.add.text(renderAnchorPoint.x + 8, renderAnchorPoint.y - 36, [
    instance.id,
    `depth ${Math.round(depth)}`,
    `anchor ${geometry.anchorGridX},${geometry.anchorGridY}`,
    `max ${maxDepthTile.x},${maxDepthTile.y}`,
  ], {
    backgroundColor: 'rgba(17, 17, 17, 0.78)',
    color: '#fff7de',
    fontFamily: 'Courier New, Lucida Console, monospace',
    fontSize: '10px',
    padding: { x: 4, y: 3 },
  });

  const container = scene.add.container(0, 0, [graphics, label]);
  container.setDepth(999999);
  return container;
}

function drawDebugDiamond(
  graphics: Phaser.GameObjects.Graphics,
  center: ScreenPoint,
  color: number,
  alpha: number,
) {
  graphics.lineStyle(1, color, alpha);
  graphics.strokePoints([
    { x: center.x, y: center.y - TILE_HEIGHT / 2 },
    { x: center.x + TILE_WIDTH / 2, y: center.y },
    { x: center.x, y: center.y + TILE_HEIGHT / 2 },
    { x: center.x - TILE_WIDTH / 2, y: center.y },
  ], true);
}

function isFurnitureDepthDebugEnabled() {
  return import.meta.env.VITE_FURNITURE_DEPTH_DEBUG === 'true';
}

function warnMissingSprite(spriteKey: string, spritePath: string) {
  if (!import.meta.env.DEV || warnedSpriteKeys.has(spriteKey)) {
    return;
  }

  warnedSpriteKeys.add(spriteKey);
  console.warn(`[RoomScene] Furniture sprite "${spriteKey}" could not be loaded from ${spritePath}. Using Phaser fallback.`);
}

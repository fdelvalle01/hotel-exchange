import Phaser from 'phaser';
import type { ScreenPoint } from '../types/game.types';
import type { FurnitureCatalogItem } from '../data/furnitureCatalog';
import {
  fallbackFurnitureForInstance,
  type StaticFurnitureInstance,
} from '../data/mainLobbyFurniture';
import { renderFurniture } from './furnitureRenderer';

type FurnitureCatalog = ReadonlyMap<string, FurnitureCatalogItem>;
type GridToIso = (x: number, y: number) => ScreenPoint;

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

    const screenPoint = spriteAnchorPoint(instance, catalogItem, gridToIso);
    const depth = spriteDepth(instance, catalogItem, gridToIso);

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
      continue;
    }

    warnMissingSprite(catalogItem.spriteKey, catalogItem.spritePath);
    const fallback = fallbackFurnitureForInstance(instance);
    if (!fallback) {
      continue;
    }

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

  return renderedObjects;
}

function spriteDepth(
  instance: StaticFurnitureInstance,
  catalogItem: FurnitureCatalogItem,
  gridToIso: GridToIso,
) {
  const basePoint = gridToIso(
    instance.x + catalogItem.width - 1,
    instance.y + catalogItem.height - 1,
  );

  return basePoint.y + (catalogItem.depthOffset ?? 0) + (instance.customDepthOffset ?? 0);
}

function spriteAnchorPoint(
  instance: StaticFurnitureInstance,
  catalogItem: FurnitureCatalogItem,
  gridToIso: GridToIso,
) {
  return gridToIso(
    instance.x + (catalogItem.anchorOffsetX ?? 0),
    instance.y + (catalogItem.anchorOffsetY ?? 0),
  );
}

function warnMissingSprite(spriteKey: string, spritePath: string) {
  if (!import.meta.env.DEV || warnedSpriteKeys.has(spriteKey)) {
    return;
  }

  warnedSpriteKeys.add(spriteKey);
  console.warn(`[RoomScene] Furniture sprite "${spriteKey}" could not be loaded from ${spritePath}. Using Phaser fallback.`);
}

export type FurnitureRotation = 'NE' | 'NW' | 'SE' | 'SW';

export type FurnitureFallbackRenderType =
  | 'iso-reception'
  | 'iso-plant'
  | 'iso-bench'
  | 'iso-lamp'
  | 'iso-door'
  | 'iso-chair'
  | 'iso-table'
  | 'iso-sofa';

export interface FurnitureCatalogItem {
  id: string;
  name: string;
  spriteKey: string;
  spritePath: string;
  width: number;
  height: number;
  blocksMovement: boolean;
  originX: number;
  originY: number;
  anchorOffsetX?: number;
  anchorOffsetY?: number;
  depthOffset?: number;
  scale?: number;
  supportedRotations?: FurnitureRotation[];
  rotationSprites?: Partial<Record<FurnitureRotation, string>>;
  fallbackRenderType: FurnitureFallbackRenderType;
}

export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  {
    id: 'red_executive_chair',
    name: 'Red Executive Chair',
    spriteKey: 'furniture_red_executive_chair',
    spritePath: '/assets/furniture/red_executive_chair.png',
    width: 1,
    height: 1,
    blocksMovement: true,
    originX: 0.5,
    originY: 1,
    depthOffset: 16,
    scale: 0.1,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-chair',
  },
  {
    id: 'dark_wood_coffee_table',
    name: 'Dark Wood Coffee Table',
    spriteKey: 'furniture_dark_wood_coffee_table',
    spritePath: '/assets/furniture/dark_wood_coffee_table.png',
    width: 2,
    height: 2,
    blocksMovement: true,
    originX: 0.5,
    originY: 1,
    anchorOffsetX: 0.5,
    anchorOffsetY: 0.5,
    depthOffset: 10,
    scale: 0.13,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-table',
  },
  {
    id: 'green_leather_sofa',
    name: 'Green Leather Sofa',
    spriteKey: 'furniture_green_leather_sofa',
    spritePath: '/assets/furniture/green_leather_sofa.png',
    width: 3,
    height: 1,
    blocksMovement: true,
    originX: 0.5,
    originY: 1,
    anchorOffsetX: 1,
    anchorOffsetY: 0,
    depthOffset: 14,
    scale: 0.12,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-sofa',
  },
];

export const FURNITURE_CATALOG_BY_ID = new Map(
  FURNITURE_CATALOG.map((item) => [item.id, item]),
);

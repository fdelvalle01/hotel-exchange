export type FurnitureRotation = 'NE' | 'NW' | 'SE' | 'SW';

export type FurnitureFallbackRenderType =
  | 'iso-reception'
  | 'iso-plant'
  | 'iso-bench'
  | 'iso-lamp'
  | 'iso-door'
  | 'iso-chair'
  | 'iso-table'
  | 'iso-sofa'
  | 'iso-market-screen'
  | 'iso-wall-sign'
  | 'iso-rug';

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
  renderOffsetX?: number;
  renderOffsetY?: number;
  depthOffset?: number;
  scale?: number;
  supportedRotations?: FurnitureRotation[];
  rotationSprites?: Partial<Record<FurnitureRotation, string>>;
  fallbackRenderType: FurnitureFallbackRenderType;
}

export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  {
    id: 'exchange_reception_desk',
    name: 'Exchange Reception Desk',
    spriteKey: 'furniture_exchange_reception_desk',
    spritePath: '/assets/furniture/exchange_reception_desk.png',
    width: 4,
    height: 1,
    blocksMovement: true,
    originX: 0.5,
    originY: 1,
    anchorOffsetX: 1.5,
    anchorOffsetY: 0,
    depthOffset: 24,
    scale: 1,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-reception',
  },
  {
    id: 'market_screen',
    name: 'Market Screen',
    spriteKey: 'furniture_market_screen',
    spritePath: '/assets/furniture/market_screen.png',
    width: 2,
    height: 1,
    blocksMovement: false,
    originX: 0.5,
    originY: 1,
    anchorOffsetX: 0.5,
    anchorOffsetY: 0,
    depthOffset: -42,
    scale: 1,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-market-screen',
  },
  {
    id: 'exchange_wall_sign',
    name: 'Exchange Wall Sign',
    spriteKey: 'furniture_exchange_wall_sign',
    spritePath: '/assets/furniture/exchange_wall_sign.png',
    width: 3,
    height: 1,
    blocksMovement: false,
    originX: 0.5,
    originY: 1,
    anchorOffsetX: 1,
    anchorOffsetY: 0,
    depthOffset: -40,
    scale: 1,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-wall-sign',
  },
  {
    id: 'office_plant',
    name: 'Office Plant',
    spriteKey: 'furniture_office_plant',
    spritePath: '/assets/furniture/office_plant.png',
    width: 1,
    height: 1,
    blocksMovement: true,
    originX: 0.5,
    originY: 1,
    depthOffset: 20,
    scale: 1,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-plant',
  },
  {
    id: 'floor_lamp',
    name: 'Floor Lamp',
    spriteKey: 'furniture_floor_lamp',
    spritePath: '/assets/furniture/floor_lamp.png',
    width: 1,
    height: 1,
    blocksMovement: true,
    originX: 0.5,
    originY: 1,
    depthOffset: 22,
    scale: 1,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-lamp',
  },
  {
    id: 'lobby_bench',
    name: 'Lobby Bench',
    spriteKey: 'furniture_lobby_bench',
    spritePath: '/assets/furniture/lobby_bench.png',
    width: 2,
    height: 1,
    blocksMovement: true,
    originX: 0.5,
    originY: 1,
    anchorOffsetX: 0.5,
    anchorOffsetY: 0,
    depthOffset: 16,
    scale: 1,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-bench',
  },
  {
    id: 'exchange_rug',
    name: 'Exchange Entrance Rug',
    spriteKey: 'furniture_exchange_rug',
    spritePath: '/assets/furniture/exchange_rug.png',
    width: 4,
    height: 2,
    blocksMovement: false,
    originX: 0.5,
    originY: 1,
    anchorOffsetX: 1.5,
    anchorOffsetY: 0.5,
    depthOffset: -48,
    scale: 1,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-rug',
  },
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
    renderOffsetY: 16,
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
    renderOffsetY: 32,
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
    renderOffsetY: 32,
    depthOffset: 14,
    scale: 0.12,
    supportedRotations: ['SE'],
    fallbackRenderType: 'iso-sofa',
  },
];

export const FURNITURE_CATALOG_BY_ID = new Map(
  FURNITURE_CATALOG.map((item) => [item.id, item]),
);

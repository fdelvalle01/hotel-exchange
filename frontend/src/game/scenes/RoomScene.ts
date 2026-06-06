import Phaser from 'phaser';
import type {
  ChatPayload,
  GridPosition,
  InventoryItem,
  PresenceUser,
  RoomFurniture,
  RoomServerEvent,
  UserMovedPayload,
} from '../../types/api.types';
import { Avatar } from '../entities/Avatar';
import type { RoomSceneOptions, ScreenPoint } from '../types/game.types';
import {
  getTileCenter,
  isoToGrid,
  isPointInsideIsoTile,
  TILE_HEIGHT,
  TILE_WIDTH,
} from '../utils/isometric';
import {
  furnitureBlockedTiles,
  mainLobbyFurnitureInstances,
  type StaticFurnitureInstance,
} from '../data/mainLobbyFurniture';
import { FURNITURE_CATALOG_BY_ID, type FurnitureRotation } from '../data/furnitureCatalog';
import {
  preloadFurnitureSprites,
  renderFurnitureSprites,
} from '../rendering/furnitureSpriteRenderer';
import {
  decodeFloorMap,
  existingTileKeys,
  walkableTileKeys,
  type RoomTileView,
} from '../data/floorMapDecoder';
import {
  renderRoomShell,
  type RoomShellConfig,
} from '../rendering/roomShellRenderer';
import {
  getExposedEdges,
  getTileVertices,
} from '../rendering/roomGeometry';

interface TileView {
  object: Phaser.GameObjects.Polygon;
  baseFill: number;
  blocked: boolean;
}

type PendingSceneEvent =
  | { type: 'presence'; presence: PresenceUser[] }
  | { type: 'serverEvent'; event: RoomServerEvent }
  | { type: 'chatBubble'; userId: number; message: string };

const SELECTED_TILE_FILL = 0xd8a23d;
const HOVER_TILE_FILL = 0x3fb6a8;
const BLOCKED_TILE_FILL = 0x4a4039;
const FLOOR_TILE_STROKE = 0x162c2a;
const FLOOR_TILE_COLORS = [0x2d4741, 0x314c45, 0x2a423d, 0x355047];

export class RoomScene extends Phaser.Scene {
  private readonly avatars = new Map<number, Avatar>();
  private readonly tiles = new Map<string, TileView>();
  private readonly furnitureInstances: StaticFurnitureInstance[];
  private readonly serverBlockedTileKeys: Set<string>;
  private readonly decorativeBlockedTileKeys: Set<string>;
  private readonly blockedTileKeys: Set<string>;
  private readonly addedFurnitureIds: Set<number>;
  private readonly furnitureObjects = new Map<string, Phaser.GameObjects.GameObject[]>();
  private readonly pendingSceneEvents: PendingSceneEvent[] = [];
  private readonly pendingChatBubblesByUser = new Map<number, string>();
  private floorLayer: Phaser.GameObjects.Container | null = null;
  private highlightLayer: Phaser.GameObjects.Container | null = null;
  private decorationLayer: Phaser.GameObjects.Container | null = null;
  private avatarLayer: Phaser.GameObjects.Container | null = null;
  private bubbleLayer: Phaser.GameObjects.Container | null = null;
  private origin: ScreenPoint = { x: 480, y: 78 };
  private selectedTileKey: string | null = null;
  private selectedHighlight: Phaser.GameObjects.Polygon | null = null;
  private sceneReady = false;

  // Placement preview state
  private placementItem: InventoryItem | null = null;
  private placementPending = false;
  private ghostLayer: Phaser.GameObjects.Container | null = null;
  private ghostGraphics: Phaser.GameObjects.Graphics | null = null;
  private ghostSprite: Phaser.GameObjects.Image | null = null;
  private ghostCurrentTile: GridPosition | null = null;
  private onExitPlacementModeCallback: (() => void) | null = null;
  private onConfirmPlacementCallback: ((x: number, y: number, rotation: string) => void) | null = null;

  // Floor map state — populated from room.model if available
  private decodedTiles: RoomTileView[] | null = null;
  private existingTileKeySet: Set<string> | null = null;
  private walkableTileKeySet: Set<string> | null = null;

  constructor(private readonly options: RoomSceneOptions) {
    super('RoomScene');
    this.furnitureInstances = mainLobbyFurnitureInstances(options.room);
    this.addedFurnitureIds = new Set((options.room.furniture ?? []).map((f) => f.id));
    this.serverBlockedTileKeys = new Set(
      (options.room.blockedTiles ?? []).map((position) => this.tileKey(position)),
    );
    this.decorativeBlockedTileKeys = new Set(
      furnitureBlockedTiles(options.room).map((position) => this.tileKey(position)),
    );
    this.blockedTileKeys = new Set([
      ...this.serverBlockedTileKeys,
      ...this.decorativeBlockedTileKeys,
    ]);
  }

  preload() {
    // Preload every catalog item so ghost sprites and newly-placed furniture
    // always have textures ready even when the room starts empty.
    const allInstances: StaticFurnitureInstance[] = Array.from(FURNITURE_CATALOG_BY_ID.keys()).map((id) => ({
      id: `catalog-preload-${id}`,
      catalogId: id,
      x: 0,
      y: 0,
      rotation: 'SE' as FurnitureRotation,
    }));
    preloadFurnitureSprites(this, allInstances, FURNITURE_CATALOG_BY_ID);
  }

  create() {
    this.origin = {
      x: this.scale.width / 2,
      y: 80,
    };
    this.createLayers();
    this.drawFloor();
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.keyboard?.on('keydown-ESC', this.handleEscKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.sceneReady = true;
    this.processPendingSceneEvents();
    this.options.onReady?.();
  }

  isReady() {
    return this.sceneReady && Boolean(this.avatarLayer && this.bubbleLayer);
  }

  setPresence(presence: PresenceUser[]) {
    if (!this.isReady()) {
      this.enqueuePresence(presence);
      return;
    }

    this.applyPresence(presence);
  }

  applyEvent(event: RoomServerEvent) {
    if (!this.isReady()) {
      this.pendingSceneEvents.push({ type: 'serverEvent', event });
      return;
    }

    if (event.type === 'USER_MOVED') {
      this.moveAvatar(event);
      return;
    }

    if (event.type === 'CHAT_MESSAGE' && event.actor) {
      const payload = event.payload as Partial<ChatPayload>;
      if (typeof payload.message === 'string') {
        this.showChatBubble(event.actor.id, payload.message);
      }
    }
  }

  showChatBubble(userId: number, message: string) {
    if (!this.isReady()) {
      this.pendingSceneEvents.push({ type: 'chatBubble', userId, message });
      return;
    }

    const avatar = this.avatars.get(userId);
    if (!avatar) {
      this.pendingChatBubblesByUser.set(userId, message);
      return;
    }

    avatar.showChatBubble(message);
  }

  private applyPresence(presence: PresenceUser[]) {
    const activeIds = new Set<number>();

    for (const presenceUser of presence) {
      activeIds.add(presenceUser.userId);
      this.upsertAvatar(presenceUser);
    }

    for (const userId of Array.from(this.avatars.keys())) {
      if (!activeIds.has(userId)) {
        this.removeAvatar(userId);
      }
    }

    this.sortAvatars();
  }

  private createLayers() {
    this.floorLayer = this.add.container(0, 0).setDepth(10);
    this.highlightLayer = this.add.container(0, 0).setDepth(20);
    const depthSortedWorldLayer = this.add.container(0, 0).setDepth(30);
    this.decorationLayer = depthSortedWorldLayer;
    this.avatarLayer = depthSortedWorldLayer;
    this.bubbleLayer = this.add.container(0, 0).setDepth(50);
  }

  private drawFloor() {
    const room = this.options.room;
    const floorMap = room.model?.floorMap;

    if (floorMap) {
      this.decodedTiles = decodeFloorMap(floorMap, room.width, room.height);
      this.existingTileKeySet = existingTileKeys(this.decodedTiles);
      this.walkableTileKeySet = walkableTileKeys(this.decodedTiles);
    }

    const shell = room.shell;
    const shellConfig: RoomShellConfig = {
      wallMode: shell?.wallMode ?? 'STANDARD',
      wallHeightPx: shell ? shell.wallHeight * TILE_HEIGHT : 92,
      sideDepthPx: 20,
    };

    this.drawRoomShellAndDecor(shellConfig);

    if (this.decodedTiles) {
      for (const tile of this.decodedTiles) {
        if (tile.exists) {
          this.createTile({ x: tile.x, y: tile.y }, tile.height);
        }
      }
    } else {
      for (let y = 0; y < room.height; y += 1) {
        for (let x = 0; x < room.width; x += 1) {
          this.createTile({ x, y }, 0);
        }
      }
    }

    this.drawRoomTrim();
    this.drawDecorations();
  }

  private createTile(position: GridPosition, tileHeight = 0) {
    const floorLayer = this.floorLayer;
    if (!floorLayer) {
      return;
    }

    const rawCenter = getTileCenter(position.x, position.y, this.origin);
    // Elevated tiles shift up on screen (basic visual; no side faces yet)
    const center: ScreenPoint = {
      x: rawCenter.x,
      y: rawCenter.y - tileHeight * (TILE_HEIGHT * 1.5),
    };

    const tileKey = this.tileKey(position);
    const blocked = this.isBlocked(position);
    const serverBlocked = this.serverBlockedTileKeys.has(tileKey);
    const fill = this.floorTileFill(position, serverBlocked, tileHeight);
    // Phaser Polygon renders with center at (x - displayOriginX, y - displayOriginY).
    // For a 64×32 diamond, displayOrigin = (32, 16), so we compensate by adding it back.
    const tile = this.add.polygon(
      center.x + TILE_WIDTH / 2,
      center.y + TILE_HEIGHT / 2,
      [
        0,
        -TILE_HEIGHT / 2,
        TILE_WIDTH / 2,
        0,
        0,
        TILE_HEIGHT / 2,
        -TILE_WIDTH / 2,
        0,
      ],
      fill,
      serverBlocked ? 0.88 : 1,
    );

    tile.setStrokeStyle(1, serverBlocked ? 0x191715 : FLOOR_TILE_STROKE, serverBlocked ? 0.38 : 0.36);
    tile.setDepth(center.y);

    if (!blocked) {
      tile.setInteractive({ useHandCursor: true });
      tile.on('pointerover', () => {
        if (!this.isSelected(position)) {
          tile.setFillStyle(HOVER_TILE_FILL, 0.54);
        }
      });
      tile.on('pointerout', () => this.paintTile(position));
    } else if (serverBlocked && !this.decorativeBlockedTileKeys.has(tileKey)) {
      this.createBlockedMarker(center);
    }

    floorLayer.add(tile);
    this.tiles.set(tileKey, {
      object: tile,
      baseFill: fill,
      blocked,
    });
  }

  private createBlockedMarker(center: ScreenPoint) {
    const decorationLayer = this.decorationLayer;
    if (!decorationLayer) {
      return;
    }

    // Blocked marker diamond 28×14 → displayOrigin (14, 7); compensate same as floor tile.
    const marker = this.add.polygon(
      center.x + 14,
      center.y + 6,
      [
        0,
        -7,
        14,
        0,
        0,
        7,
        -14,
        0,
      ],
      0x7a5147,
      0.86,
    );
    marker.setStrokeStyle(1, 0x261d1a, 0.45);
    marker.setDepth(center.y + 1);
    decorationLayer.add(marker);
  }

  private drawDecorations() {
    if (!this.decorationLayer) {
      return;
    }

    const renderedFurniture = renderFurnitureSprites(
      this,
      this.furnitureInstances,
      FURNITURE_CATALOG_BY_ID,
      (x, y) => getTileCenter(x, y, this.origin),
    );

    for (const rendered of renderedFurniture) {
      this.decorationLayer.add(rendered.object);
      const existing = this.furnitureObjects.get(rendered.id) ?? [];
      existing.push(rendered.object);
      this.furnitureObjects.set(rendered.id, existing);
    }

    this.sortAvatars();
  }

  private drawRoomShellAndDecor(config: RoomShellConfig) {
    const floorLayer = this.floorLayer;
    if (!floorLayer) {
      return;
    }

    renderRoomShell(
      this, floorLayer,
      this.decodedTiles,
      this.options.room.width,
      this.options.room.height,
      this.origin,
      config,
    );
  }

  private drawRoomTrim() {
    const floorLayer = this.floorLayer;
    if (!floorLayer) {
      return;
    }

    const trim = this.add.graphics();

    if (this.decodedTiles) {
      // Per-edge strokes follow the actual room outline regardless of shape.
      const edges = getExposedEdges(this.decodedTiles);
      trim.lineStyle(2, 0x101b19, 0.84);
      for (const edge of edges) {
        const v = getTileVertices(edge.x, edge.y, this.origin);
        trim.beginPath();
        switch (edge.face) {
          case 'NW': trim.moveTo(v.west.x, v.west.y);  trim.lineTo(v.north.x, v.north.y); break;
          case 'NE': trim.moveTo(v.north.x, v.north.y); trim.lineTo(v.east.x, v.east.y);  break;
          case 'SW': trim.moveTo(v.south.x, v.south.y); trim.lineTo(v.west.x, v.west.y);  break;
          case 'SE': trim.moveTo(v.east.x, v.east.y);  trim.lineTo(v.south.x, v.south.y); break;
        }
        trim.strokePath();
      }
    } else {
      // Rectangular fallback: diamond through bounding-box corners.
      const { room } = this.options;
      const w = room.width - 1;
      const h = room.height - 1;
      const n = getTileVertices(0, 0,   this.origin).north;
      const e = getTileVertices(w, 0,   this.origin).east;
      const s = getTileVertices(w, h,   this.origin).south;
      const wv = getTileVertices(0, h,  this.origin).west;
      trim.lineStyle(2, 0x101b19, 0.84);
      trim.beginPath();
      trim.moveTo(n.x, n.y); trim.lineTo(e.x, e.y);
      trim.lineTo(s.x, s.y); trim.lineTo(wv.x, wv.y);
      trim.closePath();
      trim.strokePath();
      trim.lineStyle(1, 0xd8a23d, 0.22);
      trim.beginPath();
      trim.moveTo(n.x, n.y + 2); trim.lineTo(e.x - 4, e.y + 1);
      trim.lineTo(s.x, s.y - 2); trim.lineTo(wv.x + 4, wv.y + 1);
      trim.closePath();
      trim.strokePath();
    }

    floorLayer.add(trim);
  }

  private upsertAvatar(presenceUser: PresenceUser, movementPath?: GridPosition[]) {
    const avatarLayer = this.avatarLayer;
    const bubbleLayer = this.bubbleLayer;
    if (!avatarLayer || !bubbleLayer) {
      return;
    }

    const position: GridPosition = {
      x: presenceUser.x,
      y: presenceUser.y,
    };
    const existing = this.avatars.get(presenceUser.userId);
    if (existing) {
      const visualPath = this.resolveVisualPath(existing, position, movementPath);
      if (visualPath.length > 0) {
        existing.walkPath(visualPath, this.origin, presenceUser.direction);
      } else {
        existing.syncTo(position, this.origin, presenceUser.direction);
      }
      this.flushPendingChatBubble(presenceUser.userId);
      this.sortAvatars();
      return;
    }

    const avatar = new Avatar(
      this,
      {
        id: presenceUser.userId,
        username: presenceUser.username,
        displayName: presenceUser.displayName,
      },
      position,
      this.origin,
      presenceUser.userId === this.options.currentUser.id,
      avatarLayer,
      bubbleLayer,
      () => this.sortAvatars(),
      presenceUser.direction,
    );
    this.avatars.set(presenceUser.userId, avatar);
    this.flushPendingChatBubble(presenceUser.userId);
    this.sortAvatars();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (this.placementPending) return;
    if (this.placementItem) {
      this.handlePlacementPointerDown(pointer);
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const position = isoToGrid(worldPoint.x, worldPoint.y, this.origin);

    if (!this.isInsideRoom(position)) {
      return;
    }

    if (!isPointInsideIsoTile(worldPoint.x, worldPoint.y, position.x, position.y, this.origin)) {
      return;
    }

    const ownedFurniture = this.ownedFurnitureAtTile(position);
    if (ownedFurniture !== null && ownedFurniture.dbId !== undefined) {
      this.options.onFurniturePickUp?.(
        ownedFurniture.dbId,
        ownedFurniture.catalogId,
        ownedFurniture.rotation ?? 'SE',
        pointer.x / this.scale.width,
        pointer.y / this.scale.height,
      );
      return;
    }

    if (this.isBlocked(position)) {
      return;
    }

    const localAvatar = this.avatars.get(this.options.currentUser.id);
    if (localAvatar) {
      const visualPath = this.findVisualPath(localAvatar.getTargetPosition(), position);
      if (visualPath.length === 0 && !this.samePosition(localAvatar.getTargetPosition(), position)) {
        return;
      }
    }

    this.selectTile(position);
    this.options.onMoveRequest(position);
  }

  private selectTile(position: GridPosition) {
    const previousSelectedTileKey = this.selectedTileKey;
    this.selectedTileKey = this.tileKey(position);

    if (previousSelectedTileKey) {
      this.paintTileByKey(previousSelectedTileKey);
    }
    this.paintTile(position);
    this.moveSelectionHighlight(position);
  }

  private moveSelectionHighlight(position: GridPosition) {
    const highlightLayer = this.highlightLayer;
    if (!highlightLayer) {
      return;
    }

    const center = getTileCenter(position.x, position.y, this.origin);

    if (!this.selectedHighlight) {
      this.selectedHighlight = this.add.polygon(
        center.x + TILE_WIDTH / 2,
        center.y + TILE_HEIGHT / 2,
        [
          0,
          -TILE_HEIGHT / 2,
          TILE_WIDTH / 2,
          0,
          0,
          TILE_HEIGHT / 2,
          -TILE_WIDTH / 2,
          0,
        ],
        SELECTED_TILE_FILL,
        0.12,
      );
      this.selectedHighlight.setStrokeStyle(1, 0xffd94e, 0.44);
      highlightLayer.add(this.selectedHighlight);
      return;
    }

    this.selectedHighlight.setPosition(center.x + TILE_WIDTH / 2, center.y + TILE_HEIGHT / 2);
    this.selectedHighlight.setVisible(true);
  }

  private paintTile(position: GridPosition) {
    this.paintTileByKey(this.tileKey(position));
  }

  private paintTileByKey(tileKey: string) {
    const tile = this.tiles.get(tileKey);
    if (!tile) {
      return;
    }

    if (this.selectedTileKey === tileKey) {
      tile.object.setFillStyle(SELECTED_TILE_FILL, 0.58);
      tile.object.setStrokeStyle(1, 0xffd94e, 0.5);
      return;
    }

    tile.object.setFillStyle(tile.baseFill, tile.blocked ? 0.88 : 1);
    tile.object.setStrokeStyle(1, tile.blocked ? 0x191715 : FLOOR_TILE_STROKE, tile.blocked ? 0.38 : 0.36);
  }

  private isSelected(position: GridPosition) {
    return this.selectedTileKey === this.tileKey(position);
  }

  private isInsideRoom(position: GridPosition) {
    if (this.existingTileKeySet) {
      return this.existingTileKeySet.has(this.tileKey(position));
    }
    // Fallback: rectangular bounds
    return position.x >= 0
      && position.y >= 0
      && position.x < this.options.room.width
      && position.y < this.options.room.height;
  }

  private isBlocked(position: GridPosition) {
    // Structural non-walkable tiles (b/B in floorMap) are always blocked
    if (this.walkableTileKeySet) {
      const key = this.tileKey(position);
      if (this.existingTileKeySet?.has(key) && !this.walkableTileKeySet.has(key)) {
        return true;
      }
    }
    return this.blockedTileKeys.has(this.tileKey(position));
  }

  private sortAvatars() {
    if (!this.avatarLayer) {
      return;
    }

    this.avatarLayer.sort('depth');
  }

  private moveAvatar(event: RoomServerEvent) {
    if (event.type !== 'USER_MOVED' || !event.actor) {
      return;
    }

    const payload = event.payload as Partial<UserMovedPayload>;
    if (typeof payload.x !== 'number' || typeof payload.y !== 'number') {
      return;
    }

    const direction = typeof payload.direction === 'string' ? payload.direction : 'south';
    const path = Array.isArray(payload.path) ? payload.path : [];

    this.upsertAvatar({
      userId: event.actor.id,
      username: event.actor.username,
      displayName: event.actor.displayName,
      x: payload.x,
      y: payload.y,
      direction,
      joinedAt: event.occurredAt,
    }, path);
  }

  private resolveVisualPath(
    avatar: Avatar,
    destination: GridPosition,
    serverPath?: GridPosition[],
  ) {
    if (this.samePosition(avatar.getTargetPosition(), destination)) {
      return [];
    }

    const localPath = this.findVisualPath(avatar.getTargetPosition(), destination);
    if (localPath.length > 0) {
      return localPath;
    }

    return serverPath ?? [];
  }

  private findVisualPath(start: GridPosition, destination: GridPosition) {
    if (this.samePosition(start, destination)) {
      return [];
    }

    if (!this.isInsideRoom(destination) || this.isBlocked(destination)) {
      return [];
    }

    const frontier: GridPosition[] = [{ ...start }];
    const cameFrom = new Map<string, string | null>();
    const positions = new Map<string, GridPosition>();
    const startKey = this.tileKey(start);
    const destinationKey = this.tileKey(destination);

    cameFrom.set(startKey, null);
    positions.set(startKey, { ...start });

    while (frontier.length > 0) {
      const current = frontier.shift();
      if (!current) {
        break;
      }

      const currentKey = this.tileKey(current);
      if (currentKey === destinationKey) {
        return this.reconstructPath(cameFrom, positions, destinationKey);
      }

      for (const next of this.neighborTiles(current)) {
        const nextKey = this.tileKey(next);
        if (cameFrom.has(nextKey) || !this.isInsideRoom(next) || this.isBlocked(next)) {
          continue;
        }

        frontier.push(next);
        cameFrom.set(nextKey, currentKey);
        positions.set(nextKey, next);
      }
    }

    return [];
  }

  private reconstructPath(
    cameFrom: Map<string, string | null>,
    positions: Map<string, GridPosition>,
    destinationKey: string,
  ) {
    const path: GridPosition[] = [];
    let currentKey: string | null = destinationKey;

    while (currentKey) {
      const position = positions.get(currentKey);
      if (!position) {
        return [];
      }
      path.push(position);
      currentKey = cameFrom.get(currentKey) ?? null;
    }

    path.reverse();
    return path.slice(1);
  }

  private neighborTiles(position: GridPosition) {
    return [
      { x: position.x + 1, y: position.y },
      { x: position.x, y: position.y + 1 },
      { x: position.x - 1, y: position.y },
      { x: position.x, y: position.y - 1 },
    ];
  }

  private removeAvatar(userId: number) {
    const avatar = this.avatars.get(userId);
    if (!avatar) {
      return;
    }

    avatar.destroy();
    this.avatars.delete(userId);
    this.pendingChatBubblesByUser.delete(userId);
  }

  private processPendingSceneEvents() {
    while (this.pendingSceneEvents.length > 0 && this.isReady()) {
      const pendingEvent = this.pendingSceneEvents.shift();
      if (!pendingEvent) {
        return;
      }

      if (pendingEvent.type === 'presence') {
        this.applyPresence(pendingEvent.presence);
        continue;
      }

      if (pendingEvent.type === 'serverEvent') {
        this.applyEvent(pendingEvent.event);
        continue;
      }

      this.showChatBubble(pendingEvent.userId, pendingEvent.message);
    }
  }

  private enqueuePresence(presence: PresenceUser[]) {
    this.pendingSceneEvents.push({
      type: 'presence',
      presence: presence.map((presenceUser) => ({ ...presenceUser })),
    });
  }

  private flushPendingChatBubble(userId: number) {
    const message = this.pendingChatBubblesByUser.get(userId);
    if (!message) {
      return;
    }

    this.pendingChatBubblesByUser.delete(userId);
    this.avatars.get(userId)?.showChatBubble(message);
  }

  private handleShutdown() {
    this.sceneReady = false;
    this.pendingSceneEvents.length = 0;
    this.pendingChatBubblesByUser.clear();
    this.avatars.clear();
    this.tiles.clear();
    this.furnitureObjects.clear();
    this.exitPlacementModeInternal(false);
    this.floorLayer = null;
    this.highlightLayer = null;
    this.decorationLayer = null;
    this.avatarLayer = null;
    this.bubbleLayer = null;
    this.selectedTileKey = null;
    this.selectedHighlight = null;
    this.decodedTiles = null;
    this.existingTileKeySet = null;
    this.walkableTileKeySet = null;
  }

  private samePosition(a: GridPosition, b: GridPosition) {
    return a.x === b.x && a.y === b.y;
  }

  private tileKey(position: GridPosition) {
    return `${position.x}:${position.y}`;
  }

  private floorTileFill(position: GridPosition, serverBlocked: boolean, tileHeight = 0) {
    if (serverBlocked) {
      return BLOCKED_TILE_FILL;
    }

    if (tileHeight > 0) {
      // Elevated tiles get a slightly lighter shade
      const hash = Math.abs((position.x * 17 + position.y * 29 + position.x * position.y * 7) % FLOOR_TILE_COLORS.length);
      return FLOOR_TILE_COLORS[hash] + 0x111111;
    }

    const hash = Math.abs((position.x * 17 + position.y * 29 + position.x * position.y * 7) % FLOOR_TILE_COLORS.length);
    return FLOOR_TILE_COLORS[hash];
  }

  // ─── Placement Preview ───────────────────────────────────────────────────

  override update(_time: number, _delta: number) {
    if (!this.placementItem || !this.ghostGraphics) return;

    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = isoToGrid(worldPoint.x, worldPoint.y, this.origin);

    const prev = this.ghostCurrentTile;
    if (prev && prev.x === tile.x && prev.y === tile.y) return;
    this.ghostCurrentTile = tile;
    this.redrawGhost(tile);
  }

  enterPlacementMode(
    item: InventoryItem,
    onExit?: () => void,
    onConfirm?: (x: number, y: number, rotation: string) => void,
  ) {
    this.exitPlacementModeInternal(false);
    this.placementItem = item;
    this.onExitPlacementModeCallback = onExit ?? null;
    this.onConfirmPlacementCallback = onConfirm ?? null;

    this.ghostLayer = this.add.container(0, 0).setDepth(40);
    this.ghostGraphics = this.add.graphics();
    this.ghostLayer.add(this.ghostGraphics);

    const catalogItem = FURNITURE_CATALOG_BY_ID.get(item.code);
    if (catalogItem && this.textures.exists(catalogItem.spriteKey)) {
      this.ghostSprite = this.add.image(0, 0, catalogItem.spriteKey);
      this.ghostSprite.setAlpha(0.72);
      this.ghostSprite.setOrigin(catalogItem.originX, catalogItem.originY);
      this.ghostSprite.setScale(catalogItem.scale ?? 1);
      this.ghostLayer.add(this.ghostSprite);
    }

    this.ghostCurrentTile = null;
  }

  exitPlacementMode() {
    this.exitPlacementModeInternal(false);
  }

  setPlacementPending(pending: boolean) {
    this.placementPending = pending;
  }

  addFurnitureInstance(furniture: RoomFurniture) {
    if (this.addedFurnitureIds.has(furniture.id)) return;
    this.addedFurnitureIds.add(furniture.id);

    const instance: StaticFurnitureInstance = {
      id: `room-furniture-${furniture.id}`,
      catalogId: furniture.catalogCode,
      x: furniture.x,
      y: furniture.y,
      rotation: this.normalizeRotation(furniture.rotation),
      width: furniture.width,
      height: furniture.height,
      blocksMovement: furniture.blocksMovement,
      dbId: furniture.id,
      ownerUserId: furniture.ownerUserId ?? null,
    };

    this.furnitureInstances.push(instance);

    if (furniture.blocksMovement) {
      for (let dy = 0; dy < furniture.height; dy++) {
        for (let dx = 0; dx < furniture.width; dx++) {
          const pos = { x: furniture.x + dx, y: furniture.y + dy };
          const key = this.tileKey(pos);
          this.decorativeBlockedTileKeys.add(key);
          this.blockedTileKeys.add(key);
          const tileView = this.tiles.get(key);
          if (tileView && !tileView.blocked) {
            tileView.blocked = true;
            tileView.object.disableInteractive();
            tileView.object.removeListener('pointerover');
            tileView.object.removeListener('pointerout');
            this.paintTileByKey(key);
          }
        }
      }
    }

    if (this.decorationLayer) {
      const rendered = renderFurnitureSprites(
        this,
        [instance],
        FURNITURE_CATALOG_BY_ID,
        (x, y) => getTileCenter(x, y, this.origin),
      );
      for (const item of rendered) {
        this.decorationLayer.add(item.object);
        const existing = this.furnitureObjects.get(item.id) ?? [];
        existing.push(item.object);
        this.furnitureObjects.set(item.id, existing);
      }
      this.sortAvatars();
    }
  }

  removeFurnitureInstance(furnitureId: number) {
    const instanceId = `room-furniture-${furnitureId}`;
    const idx = this.furnitureInstances.findIndex((i) => i.id === instanceId);
    if (idx === -1) return;

    const instance = this.furnitureInstances[idx];
    this.furnitureInstances.splice(idx, 1);
    this.addedFurnitureIds.delete(furnitureId);

    const objects = this.furnitureObjects.get(instanceId) ?? [];
    for (const obj of objects) {
      this.decorationLayer?.remove(obj);
      obj.destroy();
    }
    this.furnitureObjects.delete(instanceId);

    if (instance.blocksMovement) {
      const width = instance.width ?? 1;
      const height = instance.height ?? 1;
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const pos = { x: instance.x + dx, y: instance.y + dy };
          const key = this.tileKey(pos);
          this.decorativeBlockedTileKeys.delete(key);
          if (!this.serverBlockedTileKeys.has(key)) {
            this.blockedTileKeys.delete(key);
            const tileView = this.tiles.get(key);
            if (tileView) {
              tileView.blocked = false;
              tileView.object.setInteractive();
              this.paintTileByKey(key);
            }
          }
        }
      }
    }

    this.sortAvatars();
  }

  rotateFurnitureInstance(furnitureId: number, newRotation: string, newWidth: number, newHeight: number) {
    const instanceId = `room-furniture-${furnitureId}`;
    const instance = this.furnitureInstances.find((i) => i.id === instanceId);
    if (!instance) return;

    // Remove old blocked tiles
    if (instance.blocksMovement) {
      const oldW = instance.width ?? 1;
      const oldH = instance.height ?? 1;
      for (let dy = 0; dy < oldH; dy++) {
        for (let dx = 0; dx < oldW; dx++) {
          const pos = { x: instance.x + dx, y: instance.y + dy };
          const key = this.tileKey(pos);
          this.decorativeBlockedTileKeys.delete(key);
          if (!this.serverBlockedTileKeys.has(key)) {
            this.blockedTileKeys.delete(key);
            const tileView = this.tiles.get(key);
            if (tileView) {
              tileView.blocked = false;
              tileView.object.setInteractive();
              this.paintTileByKey(key);
            }
          }
        }
      }
    }

    instance.rotation = this.normalizeRotation(newRotation);
    instance.width = newWidth;
    instance.height = newHeight;

    // Destroy old sprites and re-render
    const objects = this.furnitureObjects.get(instanceId) ?? [];
    for (const obj of objects) {
      this.decorationLayer?.remove(obj);
      obj.destroy();
    }
    this.furnitureObjects.delete(instanceId);

    if (this.decorationLayer) {
      const rendered = renderFurnitureSprites(
        this,
        [instance],
        FURNITURE_CATALOG_BY_ID,
        (x, y) => getTileCenter(x, y, this.origin),
      );
      for (const item of rendered) {
        this.decorationLayer.add(item.object);
        const existing = this.furnitureObjects.get(item.id) ?? [];
        existing.push(item.object);
        this.furnitureObjects.set(item.id, existing);
      }
    }

    // Add new blocked tiles
    if (instance.blocksMovement) {
      for (let dy = 0; dy < newHeight; dy++) {
        for (let dx = 0; dx < newWidth; dx++) {
          const pos = { x: instance.x + dx, y: instance.y + dy };
          const key = this.tileKey(pos);
          this.decorativeBlockedTileKeys.add(key);
          this.blockedTileKeys.add(key);
          const tileView = this.tiles.get(key);
          if (tileView && !tileView.blocked) {
            tileView.blocked = true;
            tileView.object.disableInteractive();
            tileView.object.removeListener('pointerover');
            tileView.object.removeListener('pointerout');
            this.paintTileByKey(key);
          }
        }
      }
    }

    this.sortAvatars();
  }

  private ownedFurnitureAtTile(position: GridPosition): StaticFurnitureInstance | null {
    const currentUserId = this.options.currentUser.id;
    for (const instance of this.furnitureInstances) {
      if (instance.dbId === undefined) continue;
      if (instance.ownerUserId !== currentUserId) continue;
      const w = instance.width ?? 1;
      const h = instance.height ?? 1;
      if (
        position.x >= instance.x && position.x < instance.x + w &&
        position.y >= instance.y && position.y < instance.y + h
      ) {
        return instance;
      }
    }
    return null;
  }

  private normalizeRotation(rotation: string): FurnitureRotation {
    const normalized = rotation.toUpperCase();
    if (normalized === 'NE' || normalized === 'NW' || normalized === 'SE' || normalized === 'SW') {
      return normalized as FurnitureRotation;
    }
    return 'SE';
  }

  private exitPlacementModeInternal(notifyReact: boolean) {
    if (!this.placementItem) return;
    this.placementItem = null;
    this.placementPending = false;
    this.ghostCurrentTile = null;
    this.onConfirmPlacementCallback = null;

    if (this.ghostLayer) {
      this.ghostLayer.destroy(true);
      this.ghostLayer = null;
      this.ghostGraphics = null;
      this.ghostSprite = null;
    }

    const cb = this.onExitPlacementModeCallback;
    this.onExitPlacementModeCallback = null;
    if (notifyReact) cb?.();
  }

  private handleEscKey() {
    if (this.placementItem) {
      this.exitPlacementModeInternal(true);
    }
  }

  private handlePlacementPointerDown(pointer: Phaser.Input.Pointer) {
    if (pointer.rightButtonDown()) {
      this.exitPlacementModeInternal(true);
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = isoToGrid(worldPoint.x, worldPoint.y, this.origin);

    if (this.isValidPlacementAt(tile) && this.placementItem) {
      if (this.onConfirmPlacementCallback) {
        // Freeze input and wait for React to call exitPlacementMode after REST completes
        this.placementPending = true;
        this.onConfirmPlacementCallback(tile.x, tile.y, 'SE');
      } else {
        this.exitPlacementModeInternal(true);
      }
    }
  }

  private getGhostFootprintTiles(anchorX: number, anchorY: number): GridPosition[] {
    const item = this.placementItem;
    if (!item) return [];
    const tiles: GridPosition[] = [];
    for (let dy = 0; dy < item.height; dy++) {
      for (let dx = 0; dx < item.width; dx++) {
        tiles.push({ x: anchorX + dx, y: anchorY + dy });
      }
    }
    return tiles;
  }

  private isValidPlacementAt(tile: GridPosition): boolean {
    const item = this.placementItem;
    if (!item || item.quantity <= 0) return false;

    const footprint = this.getGhostFootprintTiles(tile.x, tile.y);
    return footprint.every((ft) => {
      const key = this.tileKey(ft);
      const exists = this.existingTileKeySet
        ? this.existingTileKeySet.has(key)
        : this.isInsideRoom(ft);
      const walkable = this.walkableTileKeySet
        ? this.walkableTileKeySet.has(key)
        : true;
      return exists && walkable && !this.blockedTileKeys.has(key);
    });
  }

  private redrawGhost(tile: GridPosition) {
    const graphics = this.ghostGraphics;
    const item = this.placementItem;
    if (!graphics || !item) return;

    graphics.clear();

    const footprint = this.getGhostFootprintTiles(tile.x, tile.y);
    const valid = this.isValidPlacementAt(tile);
    const fillColor = valid ? 0x00aa44 : 0xaa1111;
    const strokeColor = valid ? 0x00ff66 : 0xff3333;

    for (const ft of footprint) {
      const center = getTileCenter(ft.x, ft.y, this.origin);
      graphics.fillStyle(fillColor, 0.28);
      graphics.beginPath();
      graphics.moveTo(center.x, center.y - TILE_HEIGHT / 2);
      graphics.lineTo(center.x + TILE_WIDTH / 2, center.y);
      graphics.lineTo(center.x, center.y + TILE_HEIGHT / 2);
      graphics.lineTo(center.x - TILE_WIDTH / 2, center.y);
      graphics.closePath();
      graphics.fillPath();
      graphics.lineStyle(1, strokeColor, 0.65);
      graphics.strokePoints([
        { x: center.x, y: center.y - TILE_HEIGHT / 2 },
        { x: center.x + TILE_WIDTH / 2, y: center.y },
        { x: center.x, y: center.y + TILE_HEIGHT / 2 },
        { x: center.x - TILE_WIDTH / 2, y: center.y },
      ], true);
    }

    if (this.ghostSprite) {
      const catalogItem = FURNITURE_CATALOG_BY_ID.get(item.code);
      if (catalogItem) {
        const anchorGridX = tile.x + (catalogItem.anchorOffsetX ?? (item.width - 1) / 2);
        const anchorGridY = tile.y + (catalogItem.anchorOffsetY ?? (item.height - 1) / 2);
        const anchorPoint = getTileCenter(anchorGridX, anchorGridY, this.origin);
        this.ghostSprite.setPosition(
          anchorPoint.x + (catalogItem.renderOffsetX ?? 0),
          anchorPoint.y + (catalogItem.renderOffsetY ?? 0),
        );
        this.ghostSprite.setTint(valid ? 0x88ff88 : 0xff8888);
      }
    }
  }

}

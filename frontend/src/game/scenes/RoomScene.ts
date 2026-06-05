import Phaser from 'phaser';
import type {
  ChatPayload,
  GridPosition,
  PresenceUser,
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
import { FURNITURE_CATALOG_BY_ID } from '../data/furnitureCatalog';
import {
  preloadFurnitureSprites,
  renderFurnitureSprites,
} from '../rendering/furnitureSpriteRenderer';

interface TileView {
  object: Phaser.GameObjects.Polygon;
  baseFill: number;
  blocked: boolean;
}

interface RoomCorners {
  north: ScreenPoint;
  east: ScreenPoint;
  south: ScreenPoint;
  west: ScreenPoint;
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

  constructor(private readonly options: RoomSceneOptions) {
    super('RoomScene');
    this.furnitureInstances = mainLobbyFurnitureInstances(options.room);
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
    preloadFurnitureSprites(this, this.furnitureInstances, FURNITURE_CATALOG_BY_ID);
  }

  create() {
    this.origin = {
      x: this.scale.width / 2,
      y: 80,
    };
    this.createLayers();
    this.drawFloor();
    this.input.on('pointerdown', this.handlePointerDown, this);
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
    this.drawRoomShell();
    for (let y = 0; y < this.options.room.height; y += 1) {
      for (let x = 0; x < this.options.room.width; x += 1) {
        this.createTile({ x, y });
      }
    }
    this.drawRoomTrim();
    this.drawDecorations();
  }

  private createTile(position: GridPosition) {
    const floorLayer = this.floorLayer;
    if (!floorLayer) {
      return;
    }

    const center = getTileCenter(position.x, position.y, this.origin);
    const tileKey = this.tileKey(position);
    const blocked = this.isBlocked(position);
    const serverBlocked = this.serverBlockedTileKeys.has(tileKey);
    const fill = this.floorTileFill(position, serverBlocked);
    const tile = this.add.polygon(
      center.x,
      center.y,
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

    const marker = this.add.polygon(
      center.x,
      center.y - 1,
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
    }

    this.sortAvatars();
  }

  private drawRoomShell() {
    const floorLayer = this.floorLayer;
    if (!floorLayer) {
      return;
    }

    const corners = this.roomCorners();
    const wallHeight = 92;
    const sideDepth = 20;

    const leftWall = this.drawScenePolygon([
      corners.north,
      corners.west,
      { x: corners.west.x, y: corners.west.y - wallHeight },
      { x: corners.north.x, y: corners.north.y - wallHeight },
    ], 0x7a6253, 0.96, 0x241a17, 0.42);

    const rightWall = this.drawScenePolygon([
      corners.north,
      corners.east,
      { x: corners.east.x, y: corners.east.y - wallHeight },
      { x: corners.north.x, y: corners.north.y - wallHeight },
    ], 0x8b705d, 0.96, 0x241a17, 0.42);

    const leftBaseboard = this.drawScenePolygon([
      corners.north,
      corners.west,
      { x: corners.west.x, y: corners.west.y - 10 },
      { x: corners.north.x, y: corners.north.y - 10 },
    ], 0x3b261f, 0.96);

    const rightBaseboard = this.drawScenePolygon([
      corners.north,
      corners.east,
      { x: corners.east.x, y: corners.east.y - 10 },
      { x: corners.north.x, y: corners.north.y - 10 },
    ], 0x4a2f25, 0.96);

    const leftSide = this.drawScenePolygon([
      corners.west,
      corners.south,
      { x: corners.south.x, y: corners.south.y + sideDepth },
      { x: corners.west.x, y: corners.west.y + sideDepth },
    ], 0x172723, 1, 0x0b1312, 0.8);

    const rightSide = this.drawScenePolygon([
      corners.south,
      corners.east,
      { x: corners.east.x, y: corners.east.y + sideDepth },
      { x: corners.south.x, y: corners.south.y + sideDepth },
    ], 0x1f302b, 1, 0x0b1312, 0.8);

    floorLayer.add([leftWall, rightWall, leftBaseboard, rightBaseboard, leftSide, rightSide]);
    this.drawTradingWallDecor(corners);
  }

  private drawRoomTrim() {
    const floorLayer = this.floorLayer;
    if (!floorLayer) {
      return;
    }

    const corners = this.roomCorners();
    const trim = this.add.graphics();
    trim.lineStyle(2, 0x101b19, 0.84);
    trim.beginPath();
    trim.moveTo(corners.north.x, corners.north.y);
    trim.lineTo(corners.east.x, corners.east.y);
    trim.lineTo(corners.south.x, corners.south.y);
    trim.lineTo(corners.west.x, corners.west.y);
    trim.closePath();
    trim.strokePath();
    trim.lineStyle(1, 0xd8a23d, 0.22);
    trim.beginPath();
    trim.moveTo(corners.north.x, corners.north.y + 2);
    trim.lineTo(corners.east.x - 4, corners.east.y + 1);
    trim.lineTo(corners.south.x, corners.south.y - 2);
    trim.lineTo(corners.west.x + 4, corners.west.y + 1);
    trim.closePath();
    trim.strokePath();
    floorLayer.add(trim);
  }

  private drawTradingWallDecor(corners: RoomCorners) {
    const floorLayer = this.floorLayer;
    if (!floorLayer) {
      return;
    }

    const marketPanel = this.add.container(corners.north.x - 150, corners.north.y + 38);
    const marketBack = this.add.rectangle(0, 0, 112, 34, 0x151b18, 0.96);
    marketBack.setStrokeStyle(2, 0x0b0b0b, 1);
    const marketText = this.add.text(0, -5, 'MARKET OPEN', {
      color: '#8cff9c',
      fontFamily: 'Courier New, Lucida Console, monospace',
      fontSize: '10px',
      fontStyle: 'bold',
    });
    marketText.setOrigin(0.5);
    const tickerText = this.add.text(0, 9, 'BTC +2.4  SPY +0.8', {
      color: '#ffd94e',
      fontFamily: 'Courier New, Lucida Console, monospace',
      fontSize: '8px',
    });
    tickerText.setOrigin(0.5);
    marketPanel.add([marketBack, marketText, tickerText]);

    const deskPanel = this.add.container(corners.north.x + 142, corners.north.y + 56);
    const deskBack = this.add.rectangle(0, 0, 118, 30, 0x241a17, 0.96);
    deskBack.setStrokeStyle(2, 0xd8a23d, 0.58);
    const deskText = this.add.text(0, 0, 'EXCHANGE DESK', {
      color: '#fff1cf',
      fontFamily: 'Courier New, Lucida Console, monospace',
      fontSize: '10px',
      fontStyle: 'bold',
    });
    deskText.setOrigin(0.5);
    deskPanel.add([deskBack, deskText]);

    floorLayer.add([marketPanel, deskPanel]);
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
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const position = isoToGrid(worldPoint.x, worldPoint.y, this.origin);

    if (!this.isInsideRoom(position)) {
      return;
    }

    if (!isPointInsideIsoTile(worldPoint.x, worldPoint.y, position.x, position.y, this.origin)) {
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
        center.x,
        center.y,
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

    this.selectedHighlight.setPosition(center.x, center.y);
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
    return position.x >= 0
      && position.y >= 0
      && position.x < this.options.room.width
      && position.y < this.options.room.height;
  }

  private isBlocked(position: GridPosition) {
    return this.blockedTileKeys.has(this.tileKey(position));
  }

  private sortAvatars() {
    if (!this.avatarLayer) {
      return;
    }

    this.avatarLayer.sort('y');
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
    this.floorLayer = null;
    this.highlightLayer = null;
    this.decorationLayer = null;
    this.avatarLayer = null;
    this.bubbleLayer = null;
    this.selectedTileKey = null;
    this.selectedHighlight = null;
  }

  private samePosition(a: GridPosition, b: GridPosition) {
    return a.x === b.x && a.y === b.y;
  }

  private tileKey(position: GridPosition) {
    return `${position.x}:${position.y}`;
  }

  private floorTileFill(position: GridPosition, serverBlocked: boolean) {
    if (serverBlocked) {
      return BLOCKED_TILE_FILL;
    }

    const hash = Math.abs((position.x * 17 + position.y * 29 + position.x * position.y * 7) % FLOOR_TILE_COLORS.length);
    const isDeskZone = position.x >= 4 && position.x <= 7 && position.y >= 4 && position.y <= 8;
    if (isDeskZone) {
      return (position.x + position.y) % 2 === 0 ? 0x5a3931 : 0x4d332d;
    }

    return FLOOR_TILE_COLORS[hash];
  }

  private roomCorners(): RoomCorners {
    const width = this.options.room.width;
    const height = this.options.room.height;
    const northCenter = getTileCenter(0, 0, this.origin);
    const eastCenter = getTileCenter(width - 1, 0, this.origin);
    const southCenter = getTileCenter(width - 1, height - 1, this.origin);
    const westCenter = getTileCenter(0, height - 1, this.origin);

    return {
      north: { x: northCenter.x, y: northCenter.y - TILE_HEIGHT / 2 },
      east: { x: eastCenter.x + TILE_WIDTH / 2, y: eastCenter.y },
      south: { x: southCenter.x, y: southCenter.y + TILE_HEIGHT / 2 },
      west: { x: westCenter.x - TILE_WIDTH / 2, y: westCenter.y },
    };
  }

  private drawScenePolygon(
    points: ScreenPoint[],
    fill: number,
    alpha: number,
    stroke?: number,
    strokeAlpha = 1,
  ) {
    const graphic = this.add.graphics();
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
}

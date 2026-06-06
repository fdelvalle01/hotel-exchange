import Phaser from 'phaser';
import type { Actor, AvatarMovementState, GridPosition } from '../../types/api.types';
import { getTileCenter, TILE_HEIGHT } from '../utils/isometric';
import type { ScreenPoint } from '../types/game.types';

const STEP_DURATION_MS = 220;

type AvatarRole = 'trader' | 'broker' | 'admin' | 'guest';

interface AvatarPalette {
  jacket: number;
  jacketDark: number;
  shirt: number;
  accent: number;
  hair: number;
  skin: number;
  pants: number;
}

export class Avatar {
  private readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly directionMarker: Phaser.GameObjects.Graphics;
  private bubble: Phaser.GameObjects.Container | null = null;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;
  private activeTween: Phaser.Tweens.Tween | null = null;
  private pathQueue: GridPosition[] = [];
  private position: GridPosition;
  private targetPosition: GridPosition;
  private movementState: AvatarMovementState = 'idle';
  private direction: string;
  private walkFrame = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly actor: Actor,
    position: GridPosition,
    origin: ScreenPoint,
    private readonly isLocal: boolean,
    avatarLayer: Phaser.GameObjects.Container,
    private readonly bubbleLayer: Phaser.GameObjects.Container,
    private readonly onSortNeeded: () => void,
    direction = 'south',
  ) {
    this.position = { ...position };
    this.targetPosition = { ...position };
    this.direction = direction;
    const screenPoint = getTileCenter(position.x, position.y, origin);

    const localMarker = scene.add.ellipse(0, 2, 48, 22, 0x3fb6a8, isLocal ? 0.18 : 0);
    localMarker.setStrokeStyle(isLocal ? 2 : 0, 0x95f1e7, isLocal ? 0.82 : 0);

    const shadow = scene.add.ellipse(0, 3, 34, 14, 0x000000, 0.24);
    this.body = scene.add.graphics();
    this.paintAvatar();

    this.directionMarker = scene.add.graphics();
    this.paintDirectionMarker();

    const nameLabel = scene.add.text(0, -74, actor.displayName, {
      color: isLocal ? '#151412' : '#fff8eb',
      fontFamily: 'Inter, Segoe UI, sans-serif',
      fontSize: '13px',
      backgroundColor: isLocal ? 'rgba(216, 162, 61, 0.92)' : 'rgba(0, 0, 0, 0.38)',
      padding: { x: 6, y: 3 },
    });
    nameLabel.setOrigin(0.5);

    this.container = scene.add.container(screenPoint.x, screenPoint.y, [
      localMarker,
      shadow,
      this.body,
      this.directionMarker,
      nameLabel,
    ]);
    avatarLayer.add(this.container);
    this.syncRenderPosition();
  }

  getPosition() {
    return { ...this.position };
  }

  getTargetPosition() {
    return { ...this.targetPosition };
  }

  walkPath(path: GridPosition[], origin: ScreenPoint, direction?: string) {
    const nextPath = path
      .map((position) => ({ ...position }))
      .filter((position) => !this.samePosition(position, this.position));

    if (nextPath.length === 0) {
      this.syncTo(this.targetPosition, origin, direction);
      return;
    }

    this.stopMovement();
    this.pathQueue = nextPath;
    this.targetPosition = { ...nextPath[nextPath.length - 1] };
    this.setMovementState('walking');
    this.walkNextStep(origin, direction);
  }

  syncTo(position: GridPosition, origin: ScreenPoint, direction?: string) {
    if (this.movementState === 'walking' && this.samePosition(position, this.targetPosition)) {
      return;
    }

    this.stopMovement();
    this.position = { ...position };
    this.targetPosition = { ...position };
    this.direction = direction ?? this.direction;
    this.walkFrame = 0;
    this.paintAvatar();
    this.paintDirectionMarker();
    const screenPoint = getTileCenter(position.x, position.y, origin);
    this.container.setPosition(screenPoint.x, screenPoint.y);
    this.setMovementState('idle');
    this.syncRenderPosition();
  }

  destroy() {
    this.stopMovement();
    this.bubbleTimer?.remove(false);
    this.bubble?.destroy(true);
    this.container.destroy(true);
  }

  showChatBubble(message: string) {
    const text = this.truncateBubble(message);
    this.bubbleTimer?.remove(false);
    this.bubble?.destroy(true);

    const bubbleWidth = 166;
    const background = this.scene.add.graphics();
    const bubbleText = this.scene.add.text(0, 0, text, {
      align: 'center',
      color: '#201d19',
      fixedWidth: 148,
      fontFamily: 'Courier New, Lucida Console, monospace',
      fontSize: '12px',
      lineSpacing: 2,
      padding: { x: 4, y: 0 },
      wordWrap: { width: 140, useAdvancedWrap: true },
    });
    bubbleText.setOrigin(0.5, 0);

    const bubbleHeight = Math.min(78, Math.max(34, bubbleText.height + 14));
    background.fillStyle(0x111111, 1);
    background.fillRoundedRect(-bubbleWidth / 2 - 2, -bubbleHeight - 2, bubbleWidth + 4, bubbleHeight + 4, 7);
    background.fillTriangle(-9, -1, 9, -1, 0, 11);
    background.fillStyle(0xfff8e4, 1);
    background.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 5);
    background.fillTriangle(-6, -1, 6, -1, 0, 7);
    background.lineStyle(1, 0xd8a23d, 0.42);
    background.strokeRoundedRect(-bubbleWidth / 2 + 3, -bubbleHeight + 3, bubbleWidth - 6, bubbleHeight - 6, 4);
    bubbleText.setPosition(0, -bubbleHeight + 7);

    this.bubble = this.scene.add.container(0, 0, [background, bubbleText]);
    this.bubbleLayer.add(this.bubble);
    this.syncBubblePosition();

    this.bubbleTimer = this.scene.time.delayedCall(3600, () => {
      this.bubble?.destroy(true);
      this.bubble = null;
      this.bubbleTimer = null;
    });
  }

  private walkNextStep(origin: ScreenPoint, finalDirection?: string) {
    const nextPosition = this.pathQueue.shift();
    if (!nextPosition) {
      this.direction = finalDirection ?? this.direction;
      this.walkFrame = 0;
      this.paintAvatar();
      this.paintDirectionMarker();
      this.setMovementState('idle');
      this.syncRenderPosition();
      return;
    }

    this.direction = this.directionBetween(this.position, nextPosition);
    this.walkFrame = (this.walkFrame + 1) % 2;
    this.paintAvatar();
    this.paintDirectionMarker();
    const screenPoint = getTileCenter(nextPosition.x, nextPosition.y, origin);

    this.activeTween = this.scene.tweens.add({
      targets: this.container,
      x: screenPoint.x,
      y: screenPoint.y,
      duration: STEP_DURATION_MS,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.syncRenderPosition(),
      onComplete: () => {
        this.position = { ...nextPosition };
        this.activeTween = null;
        this.syncRenderPosition();
        this.walkNextStep(origin, finalDirection);
      },
    });
  }

  private stopMovement() {
    this.pathQueue = [];
    if (!this.activeTween) {
      return;
    }
    this.activeTween.stop();
    this.activeTween = null;
  }

  private setMovementState(state: AvatarMovementState) {
    this.movementState = state;
    this.container.setScale(state === 'walking' ? 1.02 : 1);
    this.paintAvatar();
  }

  private syncRenderPosition() {
    this.container.setDepth(this.container.y + TILE_HEIGHT / 2);
    this.syncBubblePosition();
    this.onSortNeeded();
  }

  private syncBubblePosition() {
    if (!this.bubble) {
      return;
    }
    this.bubble.setPosition(this.container.x, this.container.y - 98);
  }

  private paintDirectionMarker() {
    const markerPosition = this.directionMarkerOffset();
    this.directionMarker.clear();
    this.directionMarker.fillStyle(0xfff7e7, 0.95);
    this.directionMarker.fillRect(markerPosition.x - 2, markerPosition.y - 2, 4, 4);
  }

  private directionMarkerOffset() {
    switch (this.direction) {
      case 'north':
        return { x: 0, y: -35 };
      case 'north_east':
        return { x: 9, y: -31 };
      case 'east':
      case 'south_east':
        return { x: 13, y: -23 };
      case 'south':
        return { x: 0, y: -17 };
      case 'south_west':
      case 'west':
        return { x: -13, y: -23 };
      case 'north_west':
        return { x: -9, y: -31 };
      default:
        return { x: 0, y: -17 };
    }
  }

  private directionBetween(from: GridPosition, to: GridPosition) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (dx > 0 && dy > 0) {
      return 'south';
    }
    if (dx < 0 && dy < 0) {
      return 'north';
    }
    if (dx > 0 && dy < 0) {
      return 'east';
    }
    if (dx < 0 && dy > 0) {
      return 'west';
    }
    if (dx > 0) {
      return 'south_east';
    }
    if (dx < 0) {
      return 'north_west';
    }
    if (dy > 0) {
      return 'south_west';
    }
    if (dy < 0) {
      return 'north_east';
    }
    return this.direction;
  }

  private paintAvatar() {
    const palette = this.palette();
    const bob = this.movementState === 'walking' ? -1 : 0;
    const leftFootY = this.walkFrame === 0 ? 0 : -1;
    const rightFootY = this.walkFrame === 0 ? -1 : 0;

    this.body.clear();
    this.body.fillStyle(0x141414, 1);
    this.body.fillRect(-10, -5 + bob + leftFootY, 8, 5);
    this.body.fillRect(2, -5 + bob + rightFootY, 8, 5);

    this.body.fillStyle(palette.pants, 1);
    this.body.fillRect(-9, -17 + bob, 7, 13);
    this.body.fillRect(2, -17 + bob, 7, 13);
    this.body.fillStyle(0x101010, 0.45);
    this.body.fillRect(-1, -16 + bob, 2, 12);

    this.body.fillStyle(palette.jacketDark, 1);
    this.body.fillRect(-15, -36 + bob, 30, 22);
    this.body.fillStyle(palette.jacket, 1);
    this.body.fillRect(-12, -38 + bob, 24, 21);
    this.body.fillStyle(palette.shirt, 1);
    this.body.fillRect(-5, -38 + bob, 10, 20);
    this.body.fillStyle(palette.accent, 1);
    this.body.fillRect(-2, -34 + bob, 4, 12);

    this.body.fillStyle(palette.jacketDark, 1);
    this.body.fillRect(-19, -34 + bob, 5, 16);
    this.body.fillRect(14, -34 + bob, 5, 16);
    this.body.fillStyle(palette.skin, 1);
    this.body.fillRect(-20, -18 + bob, 6, 5);
    this.body.fillRect(14, -18 + bob, 6, 5);

    this.paintHead(palette, bob);
    this.paintRoleAccessory(palette, bob);
  }

  private paintHead(palette: AvatarPalette, bob: number) {
    const faceOffset = this.faceOffset();
    const backFacing = this.direction.includes('north');

    this.body.fillStyle(palette.skin, 1);
    this.body.fillRect(-10, -56 + bob, 20, 18);
    this.body.fillStyle(palette.hair, 1);
    this.body.fillRect(-12, -60 + bob, 24, 8);
    this.body.fillRect(-10, -54 + bob, 5, 7);
    this.body.fillRect(5, -54 + bob, 5, 7);

    if (backFacing) {
      this.body.fillStyle(palette.hair, 1);
      this.body.fillRect(-10, -52 + bob, 20, 12);
      return;
    }

    this.body.fillStyle(0x111111, 1);
    this.body.fillRect(-5 + faceOffset.x, -49 + bob + faceOffset.y, 3, 3);
    this.body.fillRect(4 + faceOffset.x, -49 + bob + faceOffset.y, 3, 3);
    this.body.fillStyle(0x8d5e35, 1);
    this.body.fillRect(faceOffset.x, -44 + bob + faceOffset.y, 4, 2);
  }

  private paintRoleAccessory(palette: AvatarPalette, bob: number) {
    const role = this.role();

    if (role === 'broker') {
      this.body.fillStyle(0x1c1c1c, 1);
      this.body.fillRect(17, -28 + bob, 7, 10);
      this.body.fillStyle(0xfff3b0, 1);
      this.body.fillRect(19, -26 + bob, 3, 3);
      return;
    }

    if (role === 'admin') {
      this.body.fillStyle(0xfff7e7, 1);
      this.body.fillRect(-7, -64 + bob, 14, 4);
      this.body.fillStyle(palette.accent, 1);
      this.body.fillRect(-3, -68 + bob, 6, 5);
      return;
    }

    if (role === 'trader') {
      this.body.fillStyle(0x202020, 1);
      this.body.fillRect(-23, -24 + bob, 9, 7);
      this.body.fillStyle(palette.accent, 1);
      this.body.fillRect(-21, -22 + bob, 5, 2);
    }
  }

  private faceOffset() {
    switch (this.direction) {
      case 'east':
      case 'south_east':
      case 'north_east':
        return { x: 3, y: 0 };
      case 'west':
      case 'south_west':
      case 'north_west':
        return { x: -3, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }

  private palette(): AvatarPalette {
    const role = this.role();
    if (role === 'trader') {
      return {
        jacket: 0x2f7f8e,
        jacketDark: 0x1f515c,
        shirt: 0xf7efe4,
        accent: 0xd8a23d,
        hair: 0x3b2618,
        skin: 0xd99b6c,
        pants: 0x26384a,
      };
    }
    if (role === 'broker') {
      return {
        jacket: 0x8b4f37,
        jacketDark: 0x5f3025,
        shirt: 0xfff1cf,
        accent: 0x3fb6a8,
        hair: 0x221811,
        skin: 0xc9865a,
        pants: 0x302c27,
      };
    }
    if (role === 'admin') {
      return {
        jacket: 0x6d62c8,
        jacketDark: 0x473f86,
        shirt: 0xf7efe4,
        accent: 0xffd94e,
        hair: 0x101010,
        skin: 0xe4ad7b,
        pants: 0x24213c,
      };
    }
    const guestColors = [0xe86d5b, 0xd8a23d, 0x8f7ee7, 0x62a76f, 0x5b96e8];
    const jacket = this.isLocal ? 0x3fb6a8 : guestColors[this.actor.id % guestColors.length];
    return {
      jacket,
      jacketDark: 0x2f2d2a,
      shirt: 0xf7efe4,
      accent: 0xffd94e,
      hair: 0x402718,
      skin: 0xd99b6c,
      pants: 0x293241,
    };
  }

  private role(): AvatarRole {
    const username = this.actor.username.toLowerCase();
    if (username.includes('admin')) {
      return 'admin';
    }
    if (username.includes('broker')) {
      return 'broker';
    }
    if (username.includes('trader') || username.includes('manager')) {
      return 'trader';
    }
    return 'guest';
  }

  private truncateBubble(message: string) {
    const normalized = message.replace(/\s+/g, ' ').trim();
    return normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized;
  }

  private samePosition(a: GridPosition, b: GridPosition) {
    return a.x === b.x && a.y === b.y;
  }
}

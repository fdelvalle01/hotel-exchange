import Phaser from 'phaser';
import type { RoomCorners } from '../types/game.types';

export function renderLegacyTradingDecor(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  corners: RoomCorners,
): void {
  const marketPanel = scene.add.container(corners.north.x - 150, corners.north.y + 38);
  const marketBack = scene.add.rectangle(0, 0, 112, 34, 0x151b18, 0.96);
  marketBack.setStrokeStyle(2, 0x0b0b0b, 1);
  const marketText = scene.add.text(0, -5, 'MARKET OPEN', {
    color: '#8cff9c',
    fontFamily: 'Courier New, Lucida Console, monospace',
    fontSize: '10px',
    fontStyle: 'bold',
  });
  marketText.setOrigin(0.5);
  const tickerText = scene.add.text(0, 9, 'BTC +2.4  SPY +0.8', {
    color: '#ffd94e',
    fontFamily: 'Courier New, Lucida Console, monospace',
    fontSize: '8px',
  });
  tickerText.setOrigin(0.5);
  marketPanel.add([marketBack, marketText, tickerText]);

  const deskPanel = scene.add.container(corners.north.x + 142, corners.north.y + 56);
  const deskBack = scene.add.rectangle(0, 0, 118, 30, 0x241a17, 0.96);
  deskBack.setStrokeStyle(2, 0xd8a23d, 0.58);
  const deskText = scene.add.text(0, 0, 'EXCHANGE DESK', {
    color: '#fff1cf',
    fontFamily: 'Courier New, Lucida Console, monospace',
    fontSize: '10px',
    fontStyle: 'bold',
  });
  deskText.setOrigin(0.5);
  deskPanel.add([deskBack, deskText]);

  layer.add([marketPanel, deskPanel]);
}

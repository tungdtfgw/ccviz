import Phaser from 'phaser';
import { barState } from '../state/BarState';

export class PhoneBooth extends Phaser.GameObjects.Container {
  private boothSprite: Phaser.GameObjects.Sprite;
  private statusText: Phaser.GameObjects.Text;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private isInUse: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Glow effect (behind booth)
    this.glowGraphics = scene.add.graphics();
    this.glowGraphics.setAlpha(0);

    // Booth sprite
    this.boothSprite = scene.add.sprite(0, 0, 'phone-booth');
    this.boothSprite.setOrigin(0.5, 0.5);

    // Status text (MCP server name)
    this.statusText = scene.add.text(0, 70, '', {
      fontSize: '8px',
      color: '#2196F3',
      fontFamily: 'monospace',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 }
    });
    this.statusText.setOrigin(0.5, 0);
    this.statusText.setVisible(false);

    this.add([this.glowGraphics, this.boothSprite, this.statusText]);
    scene.add.existing(this);

    this.setupStateListeners();
  }

  private setupStateListeners() {
    barState.on('mcp:start', (server: string) => {
      this.startCall(server);
    });

    barState.on('mcp:end', () => {
      this.endCall();
    });

    barState.on('bar:close', () => {
      this.endCall();
    });
  }

  private startCall(serverName: string) {
    if (this.isInUse) return;
    this.isInUse = true;

    // Show server name
    const displayName = serverName.length > 15 ? serverName.slice(0, 13) + '..' : serverName;
    this.statusText.setText(`MCP: ${displayName}`);
    this.statusText.setVisible(true);

    // Glow animation
    this.drawGlow();
    this.scene.tweens.add({
      targets: this.glowGraphics,
      alpha: 0.6,
      duration: 300
    });

    // Pulse animation
    this.scene.tweens.add({
      targets: this.boothSprite,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Ring animation on status text
    this.scene.tweens.add({
      targets: this.statusText,
      alpha: { from: 1, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });
  }

  private endCall() {
    if (!this.isInUse) return;
    this.isInUse = false;

    // Stop all tweens
    this.scene.tweens.killTweensOf(this.boothSprite);
    this.scene.tweens.killTweensOf(this.statusText);
    this.scene.tweens.killTweensOf(this.glowGraphics);

    // Reset
    this.boothSprite.setScale(1);
    this.statusText.setVisible(false);
    this.statusText.setAlpha(1);

    // Fade out glow
    this.scene.tweens.add({
      targets: this.glowGraphics,
      alpha: 0,
      duration: 300
    });
  }

  private drawGlow() {
    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(0x2196F3, 0.3);
    this.glowGraphics.fillCircle(0, 0, 50);
    this.glowGraphics.fillStyle(0x2196F3, 0.2);
    this.glowGraphics.fillCircle(0, 0, 70);
  }
}

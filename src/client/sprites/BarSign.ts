import Phaser from 'phaser';
import { barState } from '../state/BarState';

export class BarSign extends Phaser.GameObjects.Container {
  private signSprite: Phaser.GameObjects.Sprite;
  private countdownText: Phaser.GameObjects.Text;
  private rateLimitTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.signSprite = scene.add.sprite(0, 0, 'sign-closed');
    this.signSprite.setOrigin(0.5, 0.5);

    this.countdownText = scene.add.text(0, 20, '', {
      fontSize: '8px',
      color: '#F44336',
      fontFamily: 'monospace'
    });
    this.countdownText.setOrigin(0.5, 0);
    this.countdownText.setVisible(false);

    this.add([this.signSprite, this.countdownText]);
    scene.add.existing(this);

    this.setupStateListeners();
  }

  private setupStateListeners() {
    barState.on('bar:open', () => this.open());
    barState.on('bar:close', () => this.close());
    barState.on('rateLimit', (resetTime: number) => this.showRateLimit(resetTime));
  }

  open() {
    this.signSprite.setTexture('sign-open');
    this.countdownText.setVisible(false);
    this.rateLimitTime = 0;

    // Swing animation
    this.scene.tweens.add({
      targets: this.signSprite,
      angle: { from: -5, to: 5 },
      duration: 200,
      yoyo: true,
      repeat: 2
    });
  }

  close() {
    this.signSprite.setTexture('sign-closed');

    // Drop animation
    this.scene.tweens.add({
      targets: this.signSprite,
      y: this.signSprite.y + 5,
      duration: 100,
      yoyo: true
    });
  }

  showRateLimit(resetTime: number) {
    this.close();
    this.rateLimitTime = resetTime;
    this.countdownText.setVisible(true);
  }

  update() {
    if (this.rateLimitTime > 0) {
      const remaining = Math.max(0, this.rateLimitTime - Date.now());
      if (remaining > 0) {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        this.countdownText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
      } else {
        this.countdownText.setVisible(false);
        this.rateLimitTime = 0;
      }
    }
  }
}

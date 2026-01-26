import Phaser from 'phaser';
import { barState } from '../state/BarState';

export class BeerTower extends Phaser.GameObjects.Container {
  private towerSprite: Phaser.GameObjects.Sprite;
  private fillLevel: number = 100;
  private levelText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.towerSprite = scene.add.sprite(0, 0, 'beer-tower');
    this.towerSprite.setOrigin(0.5, 1);
    this.towerSprite.setFrame(0);

    this.levelText = scene.add.text(0, -70, '100%', {
      fontSize: '10px',
      color: '#FFC107',
      fontFamily: 'monospace'
    });
    this.levelText.setOrigin(0.5, 0.5);

    this.add([this.towerSprite, this.levelText]);
    scene.add.existing(this);

    this.setupStateListeners();
  }

  private setupStateListeners() {
    barState.on('context:update', ({ percent }) => {
      this.updateLevel(percent);
    });

    barState.on('bar:open', () => {
      this.refill();
    });
  }

  private updateLevel(percent: number) {
    this.fillLevel = percent;
    this.levelText.setText(`${Math.round(percent)}%`);

    // Update sprite frame based on level (5 frames: 0=full, 4=empty)
    let frame = 0;
    if (percent <= 20) frame = 4;
    else if (percent <= 40) frame = 3;
    else if (percent <= 60) frame = 2;
    else if (percent <= 80) frame = 1;

    this.towerSprite.setFrame(frame);

    // Color code text
    if (percent > 50) {
      this.levelText.setColor('#4CAF50');
    } else if (percent > 25) {
      this.levelText.setColor('#FFC107');
    } else {
      this.levelText.setColor('#F44336');
    }

    // Pour animation when level drops
    this.scene.tweens.add({
      targets: this.towerSprite,
      scaleY: 0.95,
      duration: 100,
      yoyo: true
    });
  }

  refill() {
    this.fillLevel = 100;
    this.towerSprite.setFrame(0);
    this.levelText.setText('100%');
    this.levelText.setColor('#4CAF50');

    // Refill animation
    this.scene.tweens.add({
      targets: this.towerSprite,
      scaleY: 1.1,
      duration: 200,
      yoyo: true
    });
  }
}

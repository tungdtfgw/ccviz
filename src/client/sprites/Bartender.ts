// Bartender NPC - stays behind counter, prepares beer, idle animations

import Phaser from 'phaser';

type BartenderState = 'idle' | 'wipe' | 'prepare';

export class Bartender extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private currentState: BartenderState = 'idle';
  private idleTimer?: Phaser.Time.TimerEvent;
  private prepareCallback?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.sprite = scene.add.sprite(0, 0, 'bartender');
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(1.1); // Slightly larger

    this.add(this.sprite);
    scene.add.existing(this);

    this.setDepth(500); // Behind counter depth

    this.createAnimations();
    this.startIdleLoop();
  }

  private createAnimations() {
    const scene = this.scene;

    if (!scene.anims.exists('bartender-idle')) {
      scene.anims.create({
        key: 'bartender-idle',
        frames: scene.anims.generateFrameNumbers('bartender', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!scene.anims.exists('bartender-prepare')) {
      scene.anims.create({
        key: 'bartender-prepare',
        frames: scene.anims.generateFrameNumbers('bartender', { start: 4, end: 5 }),
        frameRate: 4,
        repeat: 2
      });
    }

    if (!scene.anims.exists('bartender-wipe')) {
      scene.anims.create({
        key: 'bartender-wipe',
        frames: scene.anims.generateFrameNumbers('bartender', { start: 6, end: 7 }),
        frameRate: 6,
        repeat: 3
      });
    }
  }

  private startIdleLoop() {
    this.playIdle();

    // Random idle actions every 3-5 seconds
    this.idleTimer = this.scene.time.addEvent({
      delay: 3000 + Math.random() * 2000,
      callback: () => {
        if (this.currentState === 'idle') {
          // 30% chance to wipe counter
          if (Math.random() < 0.3) {
            this.playWipe();
          }
        }
      },
      loop: true
    });
  }

  private playIdle() {
    this.currentState = 'idle';
    this.sprite.play('bartender-idle');
  }

  private playWipe() {
    this.currentState = 'wipe';
    this.sprite.play('bartender-wipe');

    this.sprite.once('animationcomplete', () => {
      this.playIdle();
    });
  }

  // Called when a new session starts - bartender prepares beer
  prepareBeer(callback: () => void) {
    if (this.currentState === 'prepare') {
      // Queue the callback
      const existingCallback = this.prepareCallback;
      this.prepareCallback = () => {
        existingCallback?.();
        callback();
      };
      return;
    }

    this.prepareCallback = callback;
    this.currentState = 'prepare';
    this.sprite.play('bartender-prepare');

    this.sprite.once('animationcomplete', () => {
      const cb = this.prepareCallback;
      this.prepareCallback = undefined;
      this.playIdle();
      cb?.();
    });
  }

  destroy() {
    this.idleTimer?.destroy();
    super.destroy();
  }
}

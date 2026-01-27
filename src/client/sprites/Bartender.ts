// Bartender NPC - stays behind counter, prepares beer, idle animations
// Has name tag "claude-code" and can speak via speech bubble

import Phaser from 'phaser';
import { SpeechBubble } from './SpeechBubble';
import { getContrastingTextColor } from '../utils/color-contrast';

type BartenderState = 'idle' | 'wipe' | 'prepare';

export class Bartender extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameTag: Phaser.GameObjects.Text;
  private speechBubble: SpeechBubble;
  private currentState: BartenderState = 'idle';
  private idleTimer?: Phaser.Time.TimerEvent;
  private prepareCallback?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.sprite = scene.add.sprite(0, 0, 'bartender');
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(1.1); // Slightly larger

    // Name tag "claude-code"
    const bgColor = '#D2691E'; // Warm amber/bartender color
    this.nameTag = scene.add.text(0, -55, 'claude-code', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: getContrastingTextColor(bgColor),
      backgroundColor: bgColor,
      padding: { x: 3, y: 1 }
    });
    this.nameTag.setOrigin(0.5, 1);

    this.add([this.sprite, this.nameTag]);
    scene.add.existing(this);

    this.setDepth(535); // Above counter (530) but below items on counter (540)

    // Speech bubble above bartender (4s display for readable timing)
    this.speechBubble = new SpeechBubble(scene, x, y - 70, { maxWidth: 140, autoAdvanceMs: 4000 });

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

  /**
   * Speak a message via speech bubble
   * @param message - Text to display
   * @param teamColor - Optional team color
   * @param isAlien - Generate alien Unicode text (Phase 4)
   */
  speak(message: string, teamColor?: string, isAlien = false) {
    this.speechBubble.setText(message, teamColor, isAlien);
  }

  destroy() {
    this.idleTimer?.destroy();
    this.speechBubble?.destroy();
    super.destroy();
  }
}

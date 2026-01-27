/**
 * SpeakerControl - Interactive speaker icon with mute toggle and sound wave animation
 *
 * Features:
 * - Click to toggle mute/unmute
 * - Animated sound waves when unmuted (3 rays per side, blinking)
 * - Visual feedback for audio state
 */

import Phaser from 'phaser';
import type { AudioManager } from '../managers/audio-manager';

export class SpeakerControl extends Phaser.GameObjects.Container {
  private speakerIcon: Phaser.GameObjects.Sprite;
  private soundWaves: Phaser.GameObjects.Graphics[] = [];
  private audioManager: AudioManager;
  private animationTimer: Phaser.Time.TimerEvent | null = null;
  private waveVisible = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    audioManager: AudioManager
  ) {
    super(scene, x, y);

    this.audioManager = audioManager;

    // Speaker icon (clickable)
    this.speakerIcon = scene.add.sprite(0, 0, 'speaker-system');
    this.speakerIcon.setOrigin(0.5, 1); // Bottom-center anchor (same as trophies)
    this.speakerIcon.setInteractive({ useHandCursor: true });
    this.speakerIcon.setScale(1.2);
    this.add(this.speakerIcon);

    // Create sound wave graphics (3 short rays on right side)
    this.createSoundWaves();

    // Click handler
    this.speakerIcon.on('pointerdown', () => {
      this.toggleMute();
    });

    // Initial state
    this.updateVisualState();

    scene.add.existing(this);
    this.setDepth(100); // Above most elements
  }

  /**
   * Create 6 sound wave rays (3 on each side) matching reference image
   * Pattern: diagonal up, horizontal middle, diagonal down
   * Shorter rays with small gap from speaker edges
   */
  private createSoundWaves(): void {
    // Right side waves (shortened to 2/3 length: ~13-15px)
    const rightWaves = [
      { x1: 65, y1: -25, x2: 78, y2: -30 },    // Top: diagonal up (~13px)
      { x1: 65, y1: -15, x2: 80, y2: -15 },    // Middle: horizontal (~15px, longest)
      { x1: 65, y1: -5, x2: 78, y2: -1 }       // Bottom: diagonal down (~13px)
    ];

    // Left side waves (mirrored with same 2/3 length)
    const leftWaves = [
      { x1: -65, y1: -25, x2: -78, y2: -30 },   // Top: diagonal up (~13px)
      { x1: -65, y1: -15, x2: -80, y2: -15 },   // Middle: horizontal (~15px)
      { x1: -65, y1: -5, x2: -78, y2: -1 }      // Bottom: diagonal down (~13px)
    ];

    // Create right side waves
    rightWaves.forEach((wave) => {
      const graphics = this.scene.add.graphics();
      graphics.lineStyle(2, 0xffffff, 0.8);
      graphics.beginPath();
      graphics.moveTo(wave.x1, wave.y1);
      graphics.lineTo(wave.x2, wave.y2);
      graphics.strokePath();
      this.add(graphics);
      this.soundWaves.push(graphics);
    });

    // Create left side waves
    leftWaves.forEach((wave) => {
      const graphics = this.scene.add.graphics();
      graphics.lineStyle(2, 0xffffff, 0.8);
      graphics.beginPath();
      graphics.moveTo(wave.x1, wave.y1);
      graphics.lineTo(wave.x2, wave.y2);
      graphics.strokePath();
      this.add(graphics);
      this.soundWaves.push(graphics);
    });

    // Start blinking animation
    this.startWaveAnimation();
  }

  /**
   * Start sound wave blinking animation (400ms interval)
   */
  private startWaveAnimation(): void {
    if (this.animationTimer) {
      this.animationTimer.destroy();
    }

    this.animationTimer = this.scene.time.addEvent({
      delay: 400,
      callback: () => {
        this.waveVisible = !this.waveVisible;
        const alpha = this.waveVisible ? 1.0 : 0.3;

        this.soundWaves.forEach(wave => {
          wave.setAlpha(alpha);
        });
      },
      loop: true
    });
  }

  /**
   * Toggle mute/unmute via AudioManager
   */
  private toggleMute(): void {
    const isMuted = this.audioManager.toggleMute();
    this.updateVisualState();

    // Save preference to localStorage
    localStorage.setItem('ccviz-audio-muted', String(isMuted));

    // Start BGM when unmuting (if not already playing)
    if (!isMuted) {
      this.audioManager.playBGM('bgm-80s', true, 2000);
    }
  }

  /**
   * Update visual appearance based on mute state
   */
  private updateVisualState(): void {
    const isMuted = this.audioManager.isMuted();

    if (isMuted) {
      // Muted: hide sound waves, gray out speaker
      this.soundWaves.forEach(wave => wave.setVisible(false));
      this.speakerIcon.setTint(0x888888);

      // Stop animation
      if (this.animationTimer) {
        this.animationTimer.destroy();
        this.animationTimer = null;
      }
    } else {
      // Unmuted: show sound waves, normal color
      this.soundWaves.forEach(wave => wave.setVisible(true));
      this.speakerIcon.clearTint();

      // Start animation
      if (!this.animationTimer) {
        this.startWaveAnimation();
      }
    }
  }

  /**
   * Get current mute state from AudioManager
   */
  isMuted(): boolean {
    return this.audioManager.isMuted();
  }

  /**
   * Cleanup
   */
  destroy(fromScene?: boolean): void {
    if (this.animationTimer) {
      this.animationTimer.destroy();
      this.animationTimer = null;
    }

    super.destroy(fromScene);
  }
}

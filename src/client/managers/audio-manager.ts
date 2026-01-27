import Phaser from 'phaser';

/**
 * AudioManager - Centralized audio control for BGM and SFX
 *
 * Features:
 * - BGM looping with fade in/out
 * - Fire-and-forget SFX playback
 * - Volume control (master, music, sfx)
 * - Mute toggle
 *
 * Usage:
 *   const audioManager = new AudioManager(scene);
 *   audioManager.playBGM('bgm-80s', true, 2000);
 *   audioManager.playSFX('door-open');
 */
export class AudioManager {
  private scene: Phaser.Scene;
  private bgm: Phaser.Sound.BaseSound | null = null;
  private volumes = {
    master: 0.7,
    music: 0.8,
    sfx: 0.5
  };
  private muted = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Start background music with fade-in
   * @param key - Audio key from PreloadScene
   * @param loop - Enable looping (default: true)
   * @param fadeInMs - Fade-in duration in milliseconds (default: 1000)
   */
  playBGM(key: string, loop = true, fadeInMs = 1000): void {
    // Stop existing BGM immediately
    if (this.bgm) {
      this.stopBGM(0);
    }

    // Create new BGM instance
    this.bgm = this.scene.sound.add(key, {
      loop,
      volume: 0 // Start silent
    });

    this.bgm.play();

    // Fade in to target volume
    this.scene.tweens.add({
      targets: this.bgm,
      volume: this.volumes.master * this.volumes.music,
      duration: fadeInMs,
      ease: 'Linear'
    });
  }

  /**
   * Stop background music with fade-out
   * @param fadeOutMs - Fade-out duration in milliseconds (default: 1000)
   */
  stopBGM(fadeOutMs = 1000): void {
    if (!this.bgm) return;

    // Immediate stop (no fade)
    if (fadeOutMs === 0) {
      this.bgm.stop();
      this.bgm = null;
      return;
    }

    // Fade out then stop
    this.scene.tweens.add({
      targets: this.bgm,
      volume: 0,
      duration: fadeOutMs,
      ease: 'Linear',
      onComplete: () => {
        this.bgm?.stop();
        this.bgm = null;
      }
    });
  }

  /**
   * Play one-shot sound effect (fire-and-forget)
   * @param key - SFX key from PreloadScene
   * @param volumeOverride - Optional volume override (0-1)
   */
  playSFX(key: string, volumeOverride?: number): void {
    if (this.muted) return;

    const volume = volumeOverride ?? this.volumes.master * this.volumes.sfx;
    this.scene.sound.play(key, { volume });
  }

  /**
   * Set master volume (affects all audio)
   * @param vol - Volume level (0-1)
   */
  setMasterVolume(vol: number): void {
    this.volumes.master = Phaser.Math.Clamp(vol, 0, 1);
    this.updateBGMVolume();
  }

  /**
   * Set music volume (affects BGM only)
   * @param vol - Volume level (0-1)
   */
  setMusicVolume(vol: number): void {
    this.volumes.music = Phaser.Math.Clamp(vol, 0, 1);
    this.updateBGMVolume();
  }

  /**
   * Set SFX volume (affects sound effects only)
   * @param vol - Volume level (0-1)
   */
  setSFXVolume(vol: number): void {
    this.volumes.sfx = Phaser.Math.Clamp(vol, 0, 1);
  }

  /**
   * Update BGM volume based on current master/music settings
   */
  private updateBGMVolume(): void {
    if (this.bgm && this.bgm.isPlaying) {
      (this.bgm as Phaser.Sound.WebAudioSound).setVolume(
        this.volumes.master * this.volumes.music
      );
    }
  }

  /**
   * Mute all audio
   */
  muteAll(): void {
    this.muted = true;
    this.scene.sound.mute = true;
  }

  /**
   * Unmute all audio
   */
  unmuteAll(): void {
    this.muted = false;
    this.scene.sound.mute = false;
  }

  /**
   * Get current volume settings
   */
  getVolumes() {
    return { ...this.volumes };
  }

  /**
   * Check if audio is muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Toggle mute/unmute state
   * @returns New mute state (true = muted, false = unmuted)
   */
  toggleMute(): boolean {
    if (this.muted) {
      this.unmuteAll();
    } else {
      this.muteAll();
    }
    return this.muted;
  }

  /**
   * Cleanup - stop all audio and destroy resources
   */
  destroy(): void {
    this.stopBGM(0);
  }
}

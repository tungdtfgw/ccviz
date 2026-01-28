import Phaser from 'phaser';
import {
  DAY_NIGHT_DURATION_MS,
  TIME_BOUNDARIES,
  LIGHTING_CONFIG,
  getPhaseFromProgress,
  progressToHour,
  type DayPhase
} from '@shared/day-night-cycle-configuration-constants';

/**
 * PhaseData - Current state of the day/night cycle
 */
export interface PhaseData {
  phase: DayPhase;
  hour: number; // Current simulated hour (0-24)
  progress: number; // 0-1 progress within cycle
  darknessOpacity: number; // 0-1 opacity for black overlay
  neonLightOn: boolean; // Whether neon lights should be visible
  neonOpacity: number; // 0-1 opacity for neon light overlay
  sunlightOpacity: number; // 0-1 opacity for sunlight overlay (peaks at noon)
  shouldStartWalking: 'on' | 'off' | null; // Trigger for waiter to START walking (early)
}

/**
 * DayNightController - Manages realistic day/night lighting cycle
 *
 * Timeline (24h mapped to cycle duration):
 * - 7h-16h (Day): No overlay, natural bright light
 * - 16h-20h (Dusk): Black overlay gradually increases opacity
 * - 20h-7h (Night): Neon lights on, black overlay hidden
 *
 * Waiter interaction:
 * - At 20h: Waiter walks to switch, turns on lights
 * - At 7h: Waiter walks to switch, turns off lights
 */
export class DayNightController {
  private scene: Phaser.Scene;
  private cycleDuration: number;
  private elapsed: number = 0;
  private lastPhase: DayPhase = 'day';
  private lightsOn: boolean = false;
  private walkingTriggered: boolean = false; // Waiter started walking

  constructor(scene: Phaser.Scene, durationMs = DAY_NIGHT_DURATION_MS) {
    this.scene = scene;
    this.cycleDuration = durationMs;

    // Initialize to current real-world time
    this.initializeToRealTime();

    const currentHour = progressToHour(this.elapsed / durationMs);
    console.log(`[DayNightController] Initialized: ${durationMs}ms cycle, starting at ${currentHour.toFixed(1)}h (real time)`);
  }

  /**
   * Initialize elapsed time based on current real-world time
   * E.g., if it's 2:30 AM real time, bar starts at 2:30 AM simulated
   */
  private initializeToRealTime(): void {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Convert current time to progress (0-1)
    // 24 hours = 1.0 progress
    const totalHours = hours + minutes / 60 + seconds / 3600;
    const progress = totalHours / 24;

    this.elapsed = progress * this.cycleDuration;

    // Set initial light state based on current time
    const phase = getPhaseFromProgress(progress);
    this.lastPhase = phase;
    this.lightsOn = phase === 'night';

    console.log(`[DayNightController] Real time: ${hours}:${minutes.toString().padStart(2, '0')}, phase: ${phase}, lights: ${this.lightsOn ? 'ON' : 'OFF'}`);
  }

  /**
   * Update cycle progress and return current phase data
   * @param delta - Time elapsed since last frame (ms)
   * @returns Current phase data with lighting values
   */
  update(delta: number): PhaseData {
    this.elapsed += delta;

    // Loop when cycle completes
    if (this.elapsed >= this.cycleDuration) {
      this.elapsed -= this.cycleDuration;
      this.walkingTriggered = false; // Reset trigger for new cycle
    }

    const progress = this.elapsed / this.cycleDuration;
    return this.calculatePhaseData(progress);
  }

  /**
   * Calculate current phase data based on cycle progress
   */
  private calculatePhaseData(progress: number): PhaseData {
    const phase = getPhaseFromProgress(progress);
    const hour = progressToHour(progress);

    let darknessOpacity = 0;
    let neonLightOn = this.lightsOn;
    let neonOpacity = 0;
    let sunlightOpacity = 0;
    let shouldStartWalking: 'on' | 'off' | null = null;

    // Noon progress point (12h = 0.5)
    const noonProgress = 12 / 24;

    // Phase-specific lighting logic
    switch (phase) {
      case 'day':
        // Day: Sunlight overlay peaks at noon
        darknessOpacity = 0;

        // Keep neon on until waiter actually turns it off
        neonOpacity = this.lightsOn ? LIGHTING_CONFIG.neonLightOpacity : 0;

        // Sunlight curve: 0% at 7h → 20% at 12h → 0% at 16h
        // Only show sunlight after lights are off
        if (!this.lightsOn) {
          if (progress < noonProgress) {
            // Morning: 7h → 12h, increasing
            const morningDuration = noonProgress - TIME_BOUNDARIES.dayStart;
            const morningProgress = (progress - TIME_BOUNDARIES.dayStart) / morningDuration;
            sunlightOpacity = morningProgress * LIGHTING_CONFIG.maxSunlightOpacity;
          } else {
            // Afternoon: 12h → 16h, decreasing
            const afternoonDuration = TIME_BOUNDARIES.duskStart - noonProgress;
            const afternoonProgress = (progress - noonProgress) / afternoonDuration;
            sunlightOpacity = (1 - afternoonProgress) * LIGHTING_CONFIG.maxSunlightOpacity;
          }
        }

        // At 7h (day start): trigger waiter to walk and turn OFF lights
        if (this.lastPhase === 'night' && this.lightsOn && !this.walkingTriggered) {
          shouldStartWalking = 'off';
          this.walkingTriggered = true;
        }
        break;

      case 'dusk':
        // Dusk (16h-20h): Black overlay fades in gradually
        const duskDuration = TIME_BOUNDARIES.nightStart - TIME_BOUNDARIES.duskStart;
        const duskProgress = (progress - TIME_BOUNDARIES.duskStart) / duskDuration;
        darknessOpacity = duskProgress * LIGHTING_CONFIG.maxDarknessOpacity;
        neonOpacity = 0;
        sunlightOpacity = 0;
        break;

      case 'night':
        // Night (20h-7h): Neon lights on when waiter has toggled
        // Keep darkness during transition until waiter reaches switch
        darknessOpacity = this.lightsOn ? 0 : LIGHTING_CONFIG.maxDarknessOpacity;
        neonOpacity = this.lightsOn ? LIGHTING_CONFIG.neonLightOpacity : 0;
        sunlightOpacity = 0;

        // At 20h (night start): trigger waiter to walk and turn ON lights
        if (this.lastPhase === 'dusk' && !this.lightsOn && !this.walkingTriggered) {
          shouldStartWalking = 'on';
          this.walkingTriggered = true;
        }
        break;
    }

    // Track phase transition and reset walking trigger
    if (this.lastPhase !== phase) {
      this.walkingTriggered = false;
    }
    this.lastPhase = phase;

    return {
      phase,
      hour,
      progress,
      darknessOpacity,
      neonLightOn,
      neonOpacity,
      sunlightOpacity,
      shouldStartWalking
    };
  }

  /**
   * Manually toggle lights (called after waiter animation completes)
   */
  setLightsOn(on: boolean): void {
    this.lightsOn = on;
    console.log(`[DayNightController] Lights ${on ? 'ON' : 'OFF'}`);
  }

  /**
   * Get current elapsed time in cycle (for wall clock sync)
   */
  getElapsed(): number {
    return this.elapsed;
  }

  /**
   * Get cycle duration in milliseconds
   */
  getCycleDuration(): number {
    return this.cycleDuration;
  }

  /**
   * Reset cycle to day start (7h)
   */
  reset(): void {
    this.elapsed = TIME_BOUNDARIES.dayStart * this.cycleDuration;
    this.lightsOn = false;
    this.walkingTriggered = false;
    this.lastPhase = 'day';
  }

  /**
   * Check if lights are currently on
   */
  areLightsOn(): boolean {
    return this.lightsOn;
  }
}

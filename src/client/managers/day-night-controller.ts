import Phaser from 'phaser';
import { DAY_NIGHT_DURATION_MS, PHASE_DURATIONS } from '@shared/day-night-cycle-configuration-constants';

/**
 * PhaseData - Current state of the day/night cycle
 */
export interface PhaseData {
  name: 'dawn' | 'day' | 'dusk' | 'night';
  progress: number; // 0-1 progress within current phase
  ambientColor: Phaser.Display.Color; // Tint color for scene
  lightIntensity: number; // 0-1 for indoor lights (lamps, etc.)
}

/**
 * Ambient color palette for each phase
 */
const PHASE_COLORS = {
  dawn: new Phaser.Display.Color(255, 200, 150),  // Warm orange sunrise
  day: new Phaser.Display.Color(255, 255, 255),   // Bright white midday
  dusk: new Phaser.Display.Color(200, 150, 180),  // Purple-pink sunset
  night: new Phaser.Display.Color(40, 60, 100)    // Deep blue moonlight
};

/**
 * Light activation thresholds
 * - Lights fade in during last 30% of dusk
 * - Lights stay on during night
 * - Lights fade out during first 30% of dawn
 */
const LIGHT_ON_THRESHOLD = 0.7; // 70% through dusk → start fade in

/**
 * DayNightController - Manages time-based lighting cycle
 *
 * Features:
 * - 4-phase cycle (dawn/day/dusk/night) with configurable duration
 * - Smooth color interpolation between phases
 * - Indoor light control (fade in/out based on ambient light)
 * - Continuous looping
 *
 * Usage:
 *   const controller = new DayNightController(scene);
 *   // In scene.update():
 *   const phaseData = controller.update(delta);
 *   applyLighting(phaseData);
 */
export class DayNightController {
  private scene: Phaser.Scene;
  private cycleDuration: number;
  private elapsed: number = 0;

  constructor(scene: Phaser.Scene, durationMs = DAY_NIGHT_DURATION_MS) {
    this.scene = scene;
    this.cycleDuration = durationMs;
    console.log(`[DayNightController] Initialized with ${durationMs}ms cycle (${durationMs / 1000}s)`);
  }

  /**
   * Update cycle progress and return current phase data
   * @param delta - Time elapsed since last frame (ms)
   * @returns Current phase data with color and light intensity
   */
  update(delta: number): PhaseData {
    this.elapsed += delta;

    // Loop when cycle completes
    if (this.elapsed >= this.cycleDuration) {
      this.elapsed -= this.cycleDuration;
    }

    const progress = this.elapsed / this.cycleDuration; // 0-1
    return this.calculatePhase(progress);
  }

  /**
   * Calculate current phase based on cycle progress
   * @param progress - Overall cycle progress (0-1)
   * @returns Phase data with interpolated colors and light intensity
   */
  private calculatePhase(progress: number): PhaseData {
    // Determine current phase by comparing cumulative durations
    let cumulativeDuration = 0;
    let currentPhase: keyof typeof PHASE_DURATIONS = 'dawn';

    for (const [phase, duration] of Object.entries(PHASE_DURATIONS)) {
      cumulativeDuration += duration;
      if (progress < cumulativeDuration) {
        currentPhase = phase as keyof typeof PHASE_DURATIONS;
        break;
      }
    }

    // Calculate progress within current phase (0-1)
    const phases = Object.keys(PHASE_DURATIONS) as Array<keyof typeof PHASE_DURATIONS>;
    const phaseStart = phases
      .slice(0, phases.indexOf(currentPhase))
      .reduce((sum, p) => sum + PHASE_DURATIONS[p], 0);

    const phaseDuration = PHASE_DURATIONS[currentPhase];
    const phaseProgress = (progress - phaseStart) / phaseDuration;

    // Interpolate ambient color
    const ambientColor = this.interpolateColor(currentPhase, phaseProgress);

    // Calculate light intensity (indoor lights)
    const lightIntensity = this.calculateLightIntensity(currentPhase, phaseProgress);

    return {
      name: currentPhase,
      progress: phaseProgress,
      ambientColor,
      lightIntensity
    };
  }

  /**
   * Interpolate color between current phase and next phase
   * Uses smooth transition during last 20% of each phase
   * @param phase - Current phase name
   * @param progress - Progress within phase (0-1)
   * @returns Interpolated color
   */
  private interpolateColor(
    phase: keyof typeof PHASE_COLORS,
    progress: number
  ): Phaser.Display.Color {
    const currentColor = PHASE_COLORS[phase];

    // Determine next phase for smooth transition
    const phases = Object.keys(PHASE_COLORS) as Array<keyof typeof PHASE_COLORS>;
    const currentIndex = phases.indexOf(phase);
    const nextIndex = (currentIndex + 1) % phases.length;
    const nextColor = PHASE_COLORS[phases[nextIndex]];

    // Interpolate during last 20% of phase (smooth transition)
    if (progress > 0.8) {
      const t = (progress - 0.8) / 0.2; // 0-1 in transition zone
      const interpolated = Phaser.Display.Color.Interpolate.ColorWithColor(
        currentColor,
        nextColor,
        100,
        t * 100
      );
      return new Phaser.Display.Color(interpolated.r, interpolated.g, interpolated.b);
    }

    return currentColor.clone();
  }

  /**
   * Calculate indoor light intensity based on phase and progress
   * - Lights off during day
   * - Fade in during dusk (last 30%)
   * - Full on during night
   * - Fade out during dawn (first 30%)
   * @param phase - Current phase name
   * @param progress - Progress within phase (0-1)
   * @returns Light intensity (0-1)
   */
  private calculateLightIntensity(
    phase: keyof typeof PHASE_DURATIONS,
    progress: number
  ): number {
    if (phase === 'night') {
      // Full light intensity during night
      return 1;
    } else if (phase === 'dusk' && progress > LIGHT_ON_THRESHOLD) {
      // Fade in during last 30% of dusk
      const fadeRange = 1 - LIGHT_ON_THRESHOLD;
      return (progress - LIGHT_ON_THRESHOLD) / fadeRange;
    } else if (phase === 'dawn' && progress < 0.3) {
      // Fade out during first 30% of dawn
      return 1 - (progress / 0.3);
    } else if (phase === 'day') {
      // Lights off during day
      return 0;
    }

    return 0;
  }

  /**
   * Get current elapsed time in cycle (for debugging)
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
   * Reset cycle to beginning
   */
  reset(): void {
    this.elapsed = 0;
  }
}

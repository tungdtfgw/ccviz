/**
 * Day/Night Cycle Configuration Constants
 *
 * Simulates realistic 24-hour cycle with:
 * - Day (7h-16h): No overlay, natural light
 * - Dusk (16h-20h): Black overlay fades in gradually
 * - Night (20h-7h): Neon lights on (~80% opacity), black overlay hidden
 *
 * Waiter turns lights on at 20h, off at 7h.
 * Default cycle: 2 minutes = 24 simulated hours.
 */

// Full cycle duration in milliseconds (2 minutes = 24 simulated hours)
export const DAY_NIGHT_DURATION_MS = 120000;

// Time boundaries in 24-hour format (mapped to cycle progress 0-1)
export const TIME_BOUNDARIES = {
  // Day starts at 7:00 (7/24 = 0.2917)
  dayStart: 7 / 24,
  // Dusk starts at 16:00 (16/24 = 0.6667)
  duskStart: 16 / 24,
  // Night starts at 20:00 (20/24 = 0.8333)
  nightStart: 20 / 24,
  // Dawn/lights off at 7:00 (wraps to next day)
  lightsOff: 7 / 24
} as const;

// Lighting configuration
export const LIGHTING_CONFIG = {
  // Maximum darkness opacity during dusk transition
  maxDarknessOpacity: 0.7,
  // Neon light opacity at night (subtle glow)
  neonLightOpacity: 0.2,
  // Neon light color (white with slight blue tint)
  neonLightColor: 0xE8F4FF,
  // Dark overlay color (black)
  darkOverlayColor: 0x000000,
  // Sunlight overlay (warm yellow)
  sunlightColor: 0xFFE4B5,
  // Max sunlight opacity at noon (12h)
  maxSunlightOpacity: 0.2
} as const;

// Phase names for display
export type DayPhase = 'day' | 'dusk' | 'night';

/**
 * Get current phase based on cycle progress (0-1)
 */
export function getPhaseFromProgress(progress: number): DayPhase {
  // Normalize progress to 0-1 range
  const p = progress % 1;

  if (p >= TIME_BOUNDARIES.dayStart && p < TIME_BOUNDARIES.duskStart) {
    return 'day';
  } else if (p >= TIME_BOUNDARIES.duskStart && p < TIME_BOUNDARIES.nightStart) {
    return 'dusk';
  } else {
    return 'night';
  }
}

/**
 * Convert cycle progress (0-1) to simulated hour (0-24)
 */
export function progressToHour(progress: number): number {
  return (progress % 1) * 24;
}

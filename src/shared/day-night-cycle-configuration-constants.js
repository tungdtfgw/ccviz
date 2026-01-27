/**
 * Day/Night Cycle Configuration Constants
 *
 * Defines timing and phase distribution for the immersive lighting cycle.
 * Default cycle duration: 2 minutes (120,000ms) for fast demo/testing.
 */
// Full cycle duration in milliseconds (2 minutes default)
export const DAY_NIGHT_DURATION_MS = 120000;
// Phase distribution (percentages must sum to 1.0)
export const PHASE_DURATIONS = {
    dawn: 0.2, // 20% of cycle - warm orange sunrise
    day: 0.3, // 30% of cycle - bright midday
    dusk: 0.2, // 20% of cycle - purple/pink sunset
    night: 0.3 // 30% of cycle - deep blue moonlight
};
// Validate phase durations sum to 1.0
const totalDuration = Object.values(PHASE_DURATIONS).reduce((sum, val) => sum + val, 0);
if (Math.abs(totalDuration - 1.0) > 0.001) {
    console.warn(`[Constants] PHASE_DURATIONS sum to ${totalDuration}, expected 1.0`);
}

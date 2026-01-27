# Audio & Lighting Configuration Guide

**Date:** 2026-01-27
**Related Plan:** plans/260127-1353-immersive-game-features/

## Overview

This guide explains how to configure audio and day/night lighting features using localStorage and browser console commands. **No Settings UI is provided** - configuration is done through developer tools for flexibility and debugging.

---

## Audio Configuration

### LocalStorage Keys

Audio settings persist across page reloads using localStorage:

| Key | Type | Range | Default | Description |
|-----|------|-------|---------|-------------|
| `ccviz:audio:masterVolume` | number | 0.0-1.0 | 0.7 | Master volume multiplier |
| `ccviz:audio:musicVolume` | number | 0.0-1.0 | 0.8 | BGM volume multiplier |
| `ccviz:audio:sfxVolume` | number | 0.0-1.0 | 0.5 | SFX volume multiplier |
| `ccviz:audio:muted` | boolean | true/false | false | Mute all audio |

### Setting Volume (Browser Console)

```javascript
// Set master volume to 50%
localStorage.setItem('ccviz:audio:masterVolume', 0.5);

// Set BGM volume to 30%
localStorage.setItem('ccviz:audio:musicVolume', 0.3);

// Set SFX volume to 70%
localStorage.setItem('ccviz:audio:sfxVolume', 0.7);

// Mute all audio
localStorage.setItem('ccviz:audio:muted', 'true');

// Unmute audio
localStorage.setItem('ccviz:audio:muted', 'false');

// Reload page for changes to take effect
location.reload();
```

### Runtime Audio Controls (Console API)

AudioManager is exposed as `window.audioManager` for runtime control:

```javascript
// Volume controls (no reload needed)
window.audioManager.setMasterVolume(0.5);  // 0.0-1.0
window.audioManager.setMusicVolume(0.3);   // 0.0-1.0
window.audioManager.setSFXVolume(0.7);     // 0.0-1.0

// Mute/unmute
window.audioManager.muteAll();
window.audioManager.unmuteAll();

// BGM controls
window.audioManager.playBGM('bgm-80s');
window.audioManager.stopBGM(1000); // 1s fade out

// SFX playback
window.audioManager.playSFX('door-open');
window.audioManager.playSFX('footstep-1', 0.3); // Volume override
```

### Audio Files Location

Audio assets are stored in `public/assets/audio/`:

```
public/assets/audio/
├── music/
│   ├── bgm-80s-chiptune.mp3
│   └── bgm-80s-chiptune.ogg
└── sfx/
    ├── door-open.{mp3,ogg}
    ├── door-close.{mp3,ogg}
    ├── kitchen-door.{mp3,ogg}
    ├── footstep-1.{mp3,ogg}
    ├── footstep-2.{mp3,ogg}
    └── footstep-3.{mp3,ogg}
```

**Note:** Current assets are placeholders. See `public/assets/audio/CREDITS.md` for recommended CC0 audio sources (HoliznaCC0, Freesound.org, Pixabay).

---

## Day/Night Cycle Configuration

### LocalStorage Keys

| Key | Type | Range | Default | Description |
|-----|------|-------|---------|-------------|
| `ccviz:dayNight:duration` | number | 30000-600000 | 120000 | Full cycle duration (ms) |
| `ccviz:dayNight:enabled` | boolean | true/false | true | Enable/disable cycle |

### Setting Cycle Duration (Browser Console)

```javascript
// 2 minutes (default)
localStorage.setItem('ccviz:dayNight:duration', 120000);

// 5 minutes (slower demo)
localStorage.setItem('ccviz:dayNight:duration', 300000);

// 30 seconds (fast testing)
localStorage.setItem('ccviz:dayNight:duration', 30000);

// Disable cycle (freeze at current phase)
localStorage.setItem('ccviz:dayNight:enabled', 'false');

// Enable cycle
localStorage.setItem('ccviz:dayNight:enabled', 'true');

// Reload page for changes to take effect
location.reload();
```

### Runtime Lighting Controls (Console API)

DayNightController is exposed as `window.dayNightController` for runtime control:

```javascript
// Pause/resume cycle (no reload needed)
window.dayNightController.pause();
window.dayNightController.resume();

// Get current phase data
const phase = window.dayNightController.getCurrentPhase();
console.log(phase.name);       // 'dawn', 'day', 'dusk', 'night'
console.log(phase.color.rgba); // Current tint color
console.log(phase.lightIntensity); // 0.0-1.0
```

### Lighting Phase Distribution

The 2-minute cycle is divided into 4 phases (configured in `src/shared/day-night-cycle-configuration-constants.ts`):

| Phase | Duration | Percentage | Description |
|-------|----------|------------|-------------|
| Dawn  | 24s      | 20%        | Dark blue → Bright orange transition |
| Day   | 36s      | 30%        | Bright white ambient, lights off |
| Dusk  | 24s      | 20%        | Orange → Dark blue transition |
| Night | 36s      | 30%        | Dark blue ambient, indoor lights on |

**Total:** 120s (2 minutes)

### Customizing Phase Colors (Code)

Edit `src/shared/day-night-cycle-configuration-constants.ts`:

```typescript
export const PHASE_COLORS = {
  dawn: [
    { h: 240, s: 0.5, v: 0.3 },  // Dark blue (start)
    { h: 30, s: 0.7, v: 0.9 }    // Bright orange (end)
  ],
  day: [
    { h: 60, s: 0.1, v: 1.0 },   // Bright white (start)
    { h: 60, s: 0.1, v: 1.0 }    // Bright white (end)
  ],
  // ... dusk, night
};
```

---

## Unicode Alien Text

### Generation Algorithm

Unicode text is generated from 5 blocks with weighted random selection (configured in `src/client/utils/unicode-generator.ts`):

| Block       | Range          | Weight | Description |
|-------------|----------------|--------|-------------|
| Geometric   | U+25A0-25FF    | 3      | Shapes (■▲●) |
| Math        | U+2200-22FF    | 2      | Symbols (∀∃∈) |
| Block       | U+2580-259F    | 1      | Block elements (█▄▀) |
| Box         | U+2500-257F    | 2      | Line drawing (─│┌) |
| Dingbats    | U+2700-27BF    | 1      | Decorative (✂✉✓) |

### Phrase Structure

- **Word count:** 2-3 words per phrase
- **Word length:** 3-6 characters per word
- **Separation:** Single space between words
- **Uniqueness:** No consecutive duplicate phrases

### Manual Generation (Console)

```javascript
import { UnicodeGenerator } from './src/client/utils/unicode-generator';

// Generate 2-word phrase (default)
console.log(UnicodeGenerator.generatePhrase(2));
// Example: "▲∀■ ┌✓█"

// Generate 3-word phrase
console.log(UnicodeGenerator.generatePhrase(3));
// Example: "●∃▄ ─✉▀ ■┌∈"

// Reset state (for testing uniqueness)
UnicodeGenerator.reset();
```

### Triggering Alien Speech (Console)

```javascript
// Bartender speaks alien text
window.bartender.speak('', undefined, true);

// Waiter speaks alien text
window.waiter.speak('', undefined, true);

// Customer speaks alien text (if customer exists)
const customer = window.customerManager.getAllCustomers()[0];
customer?.speak('', true);
```

### Font Requirements

Unicode rendering requires **Noto Sans Symbols 2** font (loaded in `index.html`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&display=swap" rel="stylesheet">
```

**Fallback:** If font fails to load, monospace font is used (may show tofu boxes □).

---

## Farewell System

### Farewell Trigger

Farewells are **automatic** - no configuration needed:

- Triggered on `session:close` event
- **Both** Bartender AND Waiter say "Good Vibe" (0.5s apart)
- Speech bubbles use session team color
- Door-close SFX plays simultaneously
- Customer waits 1s before walking to exit

### Manual Farewell Test (Console)

```javascript
// Find first active session
const sessionId = Array.from(window.barState.getAllSessions().keys())[0];

// Close session (triggers farewell)
window.barState.closeSession(sessionId);
```

### Agent Communication

When sub-agents spawn (`agent:enter` event):

1. Parent customer speaks alien Unicode text (immediate)
2. Sub-agent bubble shows alien Unicode text (2s delay)
3. Both bubbles dismiss after 4s

**Manual trigger:** Spawn a sub-agent via MCP tool to test agent communication.

---

## Debugging

### Enable Verbose Logging

Add to `src/client/managers/audio-manager.ts`:

```typescript
private debug = true; // Enable debug logs

playBGM(key: string) {
  if (this.debug) console.log(`[AudioManager] Playing BGM: ${key}`);
  // ...
}
```

Add to `src/client/managers/day-night-controller.ts`:

```typescript
private debug = true; // Enable debug logs

update(delta: number) {
  if (this.debug && this.elapsedMs % 5000 < 16) {
    console.log(`[DayNight] Phase: ${phase.name}, Progress: ${progress.toFixed(2)}`);
  }
  // ...
}
```

### Performance Monitoring

```javascript
// Chrome DevTools → Performance → Record
// Or use Stats.js overlay:

import Stats from 'stats.js';
const stats = new Stats();
stats.showPanel(0); // 0: FPS, 1: ms, 2: mb
document.body.appendChild(stats.dom);

// In BarScene.update()
stats.begin();
// ... update logic
stats.end();
```

---

## Troubleshooting

### Audio Not Playing

1. **Mobile:** Tap screen to unlock audio (Web Audio API restriction)
2. **Muted:** Check `localStorage.getItem('ccviz:audio:muted')`
3. **Volume:** Check master/music/sfx volumes in localStorage
4. **Console:** Look for "Audio context suspended" warnings

### Lighting Not Updating

1. **Disabled:** Check `localStorage.getItem('ccviz:dayNight:enabled')`
2. **Paused:** Run `window.dayNightController.resume()`
3. **Performance:** Check FPS (below 30 FPS may cause stutter)
4. **Console:** Look for tinting errors in BarScene

### Unicode Shows Tofu Boxes (□)

1. **Font loading:** Check Network tab for Noto Sans Symbols 2
2. **Blocked font:** Check CORS/CSP headers
3. **Fallback:** Use Chrome DevTools → Elements → Computed → Font to verify

### Farewell Not Triggering

1. **Session active:** Verify session exists in `barState.getAllSessions()`
2. **Event listener:** Check BarScene `session:close` handler
3. **NPC availability:** Verify Bartender/Waiter sprites exist
4. **Console:** Look for "Good Vibe" speech bubble creation

---

## Configuration Presets

### Preset: Silent Mode (No Audio)

```javascript
localStorage.setItem('ccviz:audio:muted', 'true');
location.reload();
```

### Preset: Fast Cycle (30s for Testing)

```javascript
localStorage.setItem('ccviz:dayNight:duration', 30000);
location.reload();
```

### Preset: Day Only (No Night)

```javascript
localStorage.setItem('ccviz:dayNight:enabled', 'false');
// Then manually set daytime tint in console:
window.dayNightController.pause();
// Reload at daytime phase
```

### Preset: High Volume (Loud)

```javascript
localStorage.setItem('ccviz:audio:masterVolume', 1.0);
localStorage.setItem('ccviz:audio:musicVolume', 1.0);
localStorage.setItem('ccviz:audio:sfxVolume', 1.0);
location.reload();
```

### Preset: Ambient Only (No Music)

```javascript
localStorage.setItem('ccviz:audio:musicVolume', 0.0);
localStorage.setItem('ccviz:audio:sfxVolume', 0.7);
location.reload();
```

---

## Future Work

- **Settings UI Panel:** Add in-game UI for volume sliders, cycle duration input
- **Preset Profiles:** Save/load configuration presets via UI
- **Audio Visualizer:** Display waveform/spectrum during BGM playback
- **Light Animation:** Add pulse/glow effects to indoor light sprites
- **Dynamic SFX:** Vary footstep pitch/speed based on walk velocity
- **Day/Night Events:** Trigger custom logic at phase transitions (e.g., NPC dialogue changes at night)

---

## References

- **Audio Manager:** `src/client/managers/audio-manager.ts`
- **Day/Night Controller:** `src/client/managers/day-night-controller.ts`
- **Unicode Generator:** `src/client/utils/unicode-generator.ts`
- **Audio Assets:** `public/assets/audio/CREDITS.md`
- **Integration Tests:** `tests/manual/integration-test-checklist.md`
- **Implementation Plan:** `plans/260127-1353-immersive-game-features/plan.md`

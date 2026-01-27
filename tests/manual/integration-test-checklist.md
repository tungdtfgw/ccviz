# Integration Test Checklist

**Plan:** plans/260127-1353-immersive-game-features/
**Date:** 2026-01-27
**Status:** Ready for testing

## Test Environment

- **Browser:** Chrome/Firefox/Safari (test all)
- **Device:** Desktop + Mobile (touch unlock)
- **Build:** Development mode with source maps
- **Console:** Open for debugging messages

---

## Phase 1: Audio System

### BGM (Background Music)
- [ ] BGM starts playing on first user interaction (mobile unlock)
- [ ] BGM loops seamlessly without gaps
- [ ] BGM fades in smoothly (1s) on start
- [ ] BGM fades out smoothly (1s) on stop
- [ ] Volume persists across page reloads (localStorage)

### SFX (Sound Effects)
- [ ] **door-open**: Plays when new session starts (session:open)
- [ ] **door-close**: Plays when session ends (session:close)
- [ ] **kitchen-door**: Plays when MCP tool starts (mcp:start)
- [ ] **footstep-1/2/3**: Random footstep on customer/waiter/chef walk
- [ ] All SFX play without blocking (fire-and-forget)
- [ ] SFX volume independent from BGM volume

### Volume Controls (localStorage)
- [ ] `localStorage.setItem('ccviz:audio:masterVolume', 0.5)` - Master volume 0-1
- [ ] `localStorage.setItem('ccviz:audio:musicVolume', 0.8)` - BGM volume 0-1
- [ ] `localStorage.setItem('ccviz:audio:sfxVolume', 0.3)` - SFX volume 0-1
- [ ] `localStorage.setItem('ccviz:audio:muted', 'true')` - Mute all audio
- [ ] Console: `window.audioManager.setMasterVolume(0.5)`
- [ ] Console: `window.audioManager.muteAll()` / `window.audioManager.unmuteAll()`

---

## Phase 2: Day/Night Cycle

### Lighting Phases
- [ ] **Dawn** (0-24s): Dark blue → Bright orange transition
- [ ] **Day** (24-60s): Bright white ambient light, lights off
- [ ] **Dusk** (60-84s): Orange → Dark blue transition
- [ ] **Night** (84-120s): Dark blue ambient, indoor lights on (warm amber)
- [ ] Full cycle completes in 2 minutes (default)
- [ ] Cycle loops continuously without flicker

### Light Sprites
- [ ] 3 indoor lights spawn at correct positions (hanging fixtures)
- [ ] Lights are invisible during day phase
- [ ] Lights fade in smoothly during dusk → night
- [ ] Light tint color is warm amber (#FFD580)
- [ ] Lights scale/pulse slightly (optional animation)

### Performance
- [ ] 60 FPS maintained throughout cycle
- [ ] No frame drops during phase transitions
- [ ] Tinting uses multiply blend mode (not WebGL pipeline)

### Configuration (localStorage)
- [ ] `localStorage.setItem('ccviz:dayNight:duration', 120000)` - Cycle duration in ms
- [ ] `localStorage.setItem('ccviz:dayNight:enabled', 'false')` - Disable cycle
- [ ] Console: `window.dayNightController.pause()` / `window.dayNightController.resume()`

---

## Phase 3: Unicode Alien Text

### Text Generation
- [ ] Generate 10 phrases, verify no consecutive duplicates
- [ ] Each phrase has 2-3 "words" separated by spaces
- [ ] Each word is 3-6 characters long
- [ ] Characters come from 5 Unicode blocks (visual variety)
- [ ] Noto Sans Symbols 2 font renders correctly (no tofu boxes □)

### Speech Bubble Integration
- [ ] Bartender speaks alien text: `bartender.speak('', undefined, true)`
- [ ] Waiter speaks alien text: `waiter.speak('', undefined, true)`
- [ ] SessionCustomer speaks alien text: `customer.speak('', true)`
- [ ] Font family switches to "Noto Sans Symbols 2, monospace"
- [ ] Font size is 14px for alien text (12px for normal)

### Agent Communication
- [ ] When sub-agent spawns (agent:enter), parent customer speaks alien text
- [ ] After 2s delay, sub-agent bubble shows alien text
- [ ] Both bubbles dismiss after 4s (auto-advance)
- [ ] Unicode text is visually distinct from normal speech

---

## Phase 4: Farewell System

### Farewell Trigger
- [ ] When session ends (session:close), **both** Bartender AND Waiter say "Good Vibe"
- [ ] Bartender speaks first, Waiter speaks 0.5s later
- [ ] Speech bubbles use session team color
- [ ] Door-close SFX plays simultaneously with farewell
- [ ] Customer waits 1s before walking to exit

### Farewell Timing
- [ ] Speech bubble appears before customer starts walking
- [ ] Customer walk animation starts after 1s delay
- [ ] Speech bubble dismisses after 4s (standard duration)
- [ ] No overlap issues with multiple simultaneous farewells

### Edge Cases
- [ ] Test rapid session closes (2+ sessions ending within 1s)
- [ ] Test farewell when bartender/waiter already speaking
- [ ] Test farewell when customer already at exit door

---

## Cross-System Integration

### Audio + Lighting
- [ ] BGM volume doesn't affect lighting transitions
- [ ] SFX trigger during day/night phase changes
- [ ] No audio glitches during lighting transitions
- [ ] Performance stable with both systems active

### Audio + Farewells
- [ ] Door-close SFX plays with farewell speech
- [ ] Footstep SFX plays during customer exit walk
- [ ] Multiple farewells trigger multiple door-close sounds
- [ ] No audio stacking issues (fire-and-forget works)

### Unicode + Farewells
- [ ] Farewell uses normal text ("Good Vibe"), not alien text
- [ ] Agent communication uses alien text, not normal text
- [ ] Font family switches correctly between modes
- [ ] No font loading delay on first alien text render

### All Systems Together
- [ ] Start 3+ sessions with rapid succession
- [ ] Trigger agent communication during night phase
- [ ] End sessions during dusk → night transition
- [ ] Verify 60 FPS with all features active
- [ ] No console errors or warnings
- [ ] No memory leaks (run for 10+ minutes)

---

## Performance Benchmarks

### FPS Monitoring
- [ ] Chrome DevTools → Performance → Record 2-min session
- [ ] Average FPS: 60 (no drops below 55)
- [ ] Frame time: <16.67ms (60 FPS target)
- [ ] GPU usage: <30% (tinting, not shaders)

### Memory Usage
- [ ] Initial load: <50MB heap
- [ ] After 10 minutes: <80MB heap (no leaks)
- [ ] Audio buffers loaded once (not duplicated)
- [ ] Unicode font cached (not re-downloaded)

### Network
- [ ] Audio files: 7 files × 2 formats = 14 requests (or less with fallback)
- [ ] Font: 1 request to Google Fonts
- [ ] Total audio size: <2MB (compressed MP3/OGG)
- [ ] Font size: <200KB (Noto Sans Symbols 2 subset)

---

## Browser Compatibility

### Desktop
- [ ] Chrome 120+ (tested)
- [ ] Firefox 120+ (tested)
- [ ] Safari 17+ (tested)
- [ ] Edge 120+ (tested)

### Mobile
- [ ] iOS Safari (touch unlock for audio)
- [ ] Android Chrome (touch unlock for audio)
- [ ] Mobile performance: 30+ FPS acceptable

---

## Regression Tests

### Existing Features (Must Not Break)
- [ ] Session spawning (customers enter bar)
- [ ] Session closing (customers leave bar)
- [ ] Bartender/Waiter speech bubbles (normal text)
- [ ] MCP tool visualization (kitchen door, chef)
- [ ] Beer tower delivery (waiter → customer)
- [ ] Team colors (customer shirt/label/bubble)

---

## Manual Test Commands

```javascript
// Audio controls
window.audioManager.playBGM('bgm-80s');
window.audioManager.stopBGM();
window.audioManager.playSFX('door-open');
window.audioManager.setMasterVolume(0.5);
window.audioManager.muteAll();
window.audioManager.unmuteAll();

// Day/Night controls
window.dayNightController.pause();
window.dayNightController.resume();

// Unicode generation
import { UnicodeGenerator } from './src/client/utils/unicode-generator';
console.log(UnicodeGenerator.generatePhrase(2));
console.log(UnicodeGenerator.generatePhrase(3));

// Farewell test (find a session and close it)
const sessionId = Array.from(barState.getAllSessions().keys())[0];
barState.closeSession(sessionId);
```

---

## Success Criteria

All checkboxes above must pass with:
- ✅ No console errors or warnings
- ✅ 60 FPS maintained (desktop)
- ✅ TypeScript compilation successful
- ✅ No regression in existing features
- ✅ Audio works on mobile (touch unlock)
- ✅ Unicode renders correctly (no tofu boxes)
- ✅ Farewells trigger reliably
- ✅ Day/night cycle loops smoothly

---

## Known Issues / Future Work

- Audio assets are placeholders (replace with real 80s chiptune from CREDITS.md)
- Settings UI panel deferred (use localStorage + console for now)
- Agent communication visual polish (speech bubble positioning)
- Light sprite animations (pulse/glow effect)
- Audio compression optimization (further reduce file sizes)

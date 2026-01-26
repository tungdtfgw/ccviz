# Phaser.js Pixel Art Game Development Research Report

**Date:** 2026-01-26 | **Focus:** Bar scene with multiple characters & furniture

## Executive Summary

Phaser.js provides robust pixel art support through configuration settings, sprite sheet/texture atlas systems, and performance optimization techniques essential for a bar scene with multiple animated characters. Key findings emphasize crisp pixel rendering via `pixelArt: true` config, sprite sheet organization with consistent frame dimensions, object pooling for character management, and tilemap optimization.

---

## 1. Pixel Art Rendering Settings

### Critical Configuration
```
pixelArt: true  // Enables nearest-neighbor filtering & GPU-based pixel rounding
roundPixels: true  // Rounds sprite coordinates to whole pixels
```

### Implementation Details
- **Crisp Pixels**: Set `pixelArt: true` in game config to use nearest-neighbor interpolation instead of anti-aliasing
- **New Approach**: Modern Phaser versions use smooth pixel art technique with vertex shader uniform `uRoundPixels` (GPU-calculated vs CPU)
- **Canvas Setup**: Use `Phaser.Canvas.setImageRenderingCrisp(canvas)` for browser compatibility
- **No Blurring**: Disables WebGL anti-aliasing automatically; scaled sprites maintain square pixel appearance

### Bar Scene Application
For your bar scene, this ensures customers, bartender, and furniture maintain clean edges at any zoom level.

---

## 2. Sprite Animation for Character Movement

### Sprite Sheet Best Practices
- **Uniform Dimensions**: All animation frames must be identical width/height (e.g., 32x48 pixels)
- **Sequential Layout**: Frames arranged horizontally or vertically in consistent grid
- **Frame Naming**: Integer keys starting from 0, or named frames via texture atlas

### Animation Creation Pattern
```javascript
this.anims.create({
  key: 'walk-left',
  frames: this.anims.generateFrameNumbers('character', { start: 0, end: 7 }),
  frameRate: 10,
  repeat: -1  // Infinite loop
});
```

### Key Insights
- **Two-Frame Minimum**: Start simple—communicating movement with 2-3 frames is effective
- **Trigger Logic**: Separate animation changes from movement logic; update loop triggers frame restart each cycle without proper checks
- **Tools**: Aseprite exports animations as JSON for direct Phaser integration

### Character Implementation
Create sprite sheets for walk cycles (left/right/idle) with 6-8 frames each for natural motion.

---

## 3. Tilemap & Scene Composition

### Tilemap Layer Optimization
- **No Performance Impact**: Tile count itself doesn't cause performance loss—4 large background images (parallax) have negligible impact
- **Layer Limits**: Multiple tilemap layers are manageable; focus on optimization elsewhere
- **TileSprite Caution**: Avoid TileSprites > canvas size; use `tilePosition` property for scrolling effects instead

### Scene Structure
Use Phaser's Scene objects for modular organization:
- Scene for background/furniture (static tilemap)
- Scene for characters/NPCs (dynamic sprites)
- Scene for UI overlay

---

## 4. Performance Optimization for Multiple Sprites

### Object Pooling (Essential)
```javascript
// Create pool of character sprites ahead of time
const pool = this.add.group({
  classType: Character,
  maxSize: 10  // Max customers + bartender + waiter
});

// Reuse instead of creating new instances
const character = pool.get(x, y);
character.setActive(true).setVisible(true);
```

### Memory Management
- **Allocation in Update Loop**: Primary cause of frame drops; object pooling prevents this
- **Deactivation**: Set `visible = false` and `active = false` instead of destroying
- **Cleanup**: Stop tweens/particle emitters before reusing objects

### GPU-Based Pixel Rounding
Recent Phaser versions calculate `uRoundPixels` on GPU, reducing CPU math in intensive scenes.

---

## 5. Asset Pipeline for Pixel Art

### Loading Strategy
**Texture Atlas (Recommended)**
```javascript
this.load.atlas('sprites', 'assets/sprites.png', 'assets/sprites.json');
```

**Sprite Sheets (Uniform Grid)**
```javascript
this.load.spritesheet('character', 'assets/character.png', {
  frameWidth: 32,
  frameHeight: 48
});
```

### Tools & Workflow
- **TexturePacker**: Industry standard; generates Phaser 3 format atlases
- **Aseprite**: Best for pixel art animation export (JSON + PNG)
- **Benefits**: Single HTTP request for all graphics vs multiple file loads

### Bar Scene Assets
Organize as:
- `sprites-characters.atlas` (customers, bartender, waiter animations)
- `sprites-furniture.atlas` (tables, bar, bottles—static frames)
- `sprites-ui.atlas` (buttons, glass counter displays)

---

## Actionable Recommendations

1. **Config**: Enable `pixelArt: true` and `roundPixels: true` in game initialization
2. **Sprites**: Create 32x32 or 32x48 pixel art with 6-8 frame walk cycles per direction
3. **Pooling**: Implement object pool for 10-15 max active characters
4. **Assets**: Use TexturePacker or Aseprite to create atlases; load once at scene start
5. **Rendering**: Test on target devices; GPU pixel rounding handles scaling automatically
6. **Tilemap**: Keep background as single static tilemap layer; don't over-optimize

---

## Unresolved Questions

- What's your target pixel size (16x16, 32x32, 64x64)?
- Will characters animate on demand or continuously loop?
- Need parallax scrolling or fixed viewport?

---

## Sources

- [Phaser Editor 2D - Pixel Art Rendering](https://help-v3.phasereditor2d.com/scene-editor/misc-pixel-art.html)
- [Photon Storm - Pixel Perfect Scaling](https://photonstorm.com/phaser/pixel-perfect-scaling-a-phaser-game/)
- [Belen Albeza - Retro Crisp Pixel Art in Phaser](https://www.belenalbeza.com/articles/retro-crisp-pixel-art-in-phaser/)
- [Medium - Creating Animating Pixel Art with Phaser](https://medium.com/geekculture/creating-and-animating-pixel-art-in-javascript-phaser-54b18699442d)
- [Phaser Docs - Animations](https://docs.phaser.io/phaser/concepts/animations)
- [Medium - Sprite Sheets and Movement Animation](https://medium.com/@Shakuro/phaser-js-tutorial-sprite-sheets-and-movement-animation-53ad452ab57)
- [Modular Game Worlds in Phaser 3 - Tilemaps](https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6)
- [Phaser Docs - TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer)
- [TexturePacker - Phaser Tutorial](https://www.codeandweb.com/texturepacker/tutorials/how-to-create-sprite-sheets-for-phaser)
- [Phaser News - Optimization 2025](https://phaser.io/news/2025/03/how-i-optimized-my-phaser-3-action-game-in-2025)
- [Ourcade - Object Pooling in Phaser 3](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-basic/)
- [Phaser Docs - Textures](https://docs.phaser.io/phaser/concepts/textures)

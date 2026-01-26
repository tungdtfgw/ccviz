# RobotRunCC Project Scout Report
**Date:** 2026-01-26  
**Focus:** Phaser Game Scene Structure, Colors, Sprites, Asset Definitions

---

## 1. Project Overview
RobotRunCC is a Phaser-based sports bar visualization for Claude Code sessions. Displays football fans (representing Claude sessions) in a bar setting with interactive UI elements.

**Key Files Analyzed:**
- `/src/client/scenes/BarScene.ts` - Main game scene
- `/src/client/scenes/PreloadScene.ts` - Asset/texture generation
- `/src/client/sprites/PhoneBooth.ts` - Phone booth sprite
- `/src/client/sprites/SessionCustomer.ts` - Customer (session) sprite
- `/src/client/sprites/SessionCustomerManager.ts` - Customer manager
- `/src/client/main.ts` - Game config
- `/index.html` - HTML/styling
- `/src/shared/football-team-configs-and-sprite-mappings.ts` - Team colors

---

## 2. Game Configuration

### Canvas Setup
- **Size:** 800x600 pixels
- **Renderer:** Phaser.AUTO
- **Background:** `#1a1a2e` (dark navy)
- **Parent:** `#game-container` div
- **Scale Mode:** FIT with center-both
- **Physics:** Arcade (no gravity)

### HTML Configuration
- **Title:** "Robot Runner CC"
- **Container Border:** 4px solid `#4a4e69` (muted purple-blue)
- **Container Background:** `#1a1a2e`
- **Meta:** UTF-8, viewport responsive

---

## 3. Scene Positions & Layout

### Bar Layout (800x600)
```
Upper Wall (0-260px) - Decorations, TV, Shelves
│
├─ TV: (400, 120)
├─ Trophy Shelf: (150, 100)
├─ Scarves: [(80, 150), (580, 150)]
├─ Pennants: [(250, 80), (550, 80)]
├─ Photos: [(320, 180), (480, 180)]
│
Mid Section (260-520px) - Tables & Customers
│
├─ Top Row Tables (y=320):
│  ├─ Table 0: (120, 320)
│  ├─ Table 1: (280, 320)
│  ├─ Table 2: (440, 320)
│  ├─ Table 3: (600, 320)
│
├─ Bottom Row Tables (y=450):
│  ├─ Table 4: (120, 450)
│  ├─ Table 5: (280, 450)
│  ├─ Table 6: (440, 450)
│  ├─ Table 7: (600, 450)
│
├─ Sub-agent Spots (Near tables):
│  ├─ Near top row: [(150, 350), (310, 350), (470, 350), (630, 350)]
│  └─ Near bottom row: [(150, 480), (310, 480), (470, 480), (630, 480)]
│
├─ Phone Booth: (60, 280)
├─ Kitchen Door: (700, 180)
│
Lower Section (520-600px) - Bar Counter
│
├─ Bar Counter: (400, 560)
├─ Bartender: (520, 560)
├─ Beer Tower: (480, 540)
├─ Waiter Home: (350, 500)
├─ Waiter Counter: (450, 520)
├─ Menu Board: (200, 520)
├─ Entrance Door: (750, 450)
│
Decorations on Counter:
├─ Beer Glasses: [(150, 515), (180, 515), (210, 515), (240, 515), (270, 515)]
```

---

## 4. Color Palette

### Environment Colors (Hex)
```
Walls & Floor:
- Upper wall (dark brown): 0x5D4037
- Wall panels (darker brown): 0x4E342E
- Wall accent stripes: 0x8D6E63
- Upper floor (medium brown): 0x8D6E63
- Lower floor (tan): 0xA1887F
- Floor lines (shadow): 0x795548

Furniture:
- Table surface: 0x5D4037
- Table edge: 0x4E342E
- Chairs: 0x8D6E63
- Bar counter inner: 0x3E2723
- Bar counter top: 0x5D4037
- Beer tap color: 0x795548
- Beer tap lever (gold): 0xFFC107

Entrance Door:
- Frame (gray): 0x757575
- Inner (darker gray): 0x616161
- Window (light blue): 0x81D4FA
- Handle (gold): 0xFFD54F

Wall Accents:
- Top stripe: 0x8D6E63 (at y=100)
- Bottom stripe: 0x8D6E63 (at y=200)
```

### UI/Status Colors (RGB Hex)
```
Phone Booth:
- Glow/Status: #2196F3 (blue)
- Background: #000000aa

PhoneBooth Text:
- Color: #2196F3

Beer Tower Level Indicator:
- High (>50%): #4CAF50 (green)
- Medium (>25%): #FFC107 (amber)
- Low (≤25%): #F44336 (red)

Customer Context Label:
- High: #4CAF50
- Medium: #FFC107
- Low: #F44336

Tokens Label: #AAAAAA (gray)

Speech Bubbles:
- Font: monospace
- Default: varies by team colors
```

### Team Colors (8 Football Teams)
```
1. Manchester United
   - Primary: #DA291C (red)
   - Secondary: #FFE500 (gold)
   - Sprite Key: fan-mu

2. Chelsea
   - Primary: #034694 (blue)
   - Secondary: #DBA111 (gold)
   - Sprite Key: fan-chelsea

3. Arsenal
   - Primary: #EF0107 (red)
   - Secondary: #FFFFFF (white)
   - Sprite Key: fan-arsenal

4. Real Madrid
   - Primary: #FFFFFF (white)
   - Secondary: #00529F (blue)
   - Sprite Key: fan-real-madrid

5. Barcelona
   - Primary: #004D98 (blue)
   - Secondary: #A50044 (maroon)
   - Sprite Key: fan-barcelona

6. Juventus
   - Primary: #000000 (black)
   - Secondary: #FFFFFF (white)
   - Sprite Key: fan-juventus

7. AC Milan
   - Primary: #FB090B (red)
   - Secondary: #000000 (black)
   - Sprite Key: fan-ac-milan

8. Liverpool
   - Primary: #C8102E (red)
   - Secondary: #00B2A9 (teal)
   - Sprite Key: fan-liverpool
```

### Decoration Colors
```
Scarves:
- Default: #DA291C (red) - Manchester United
- Tinted (index 1): 0x004D98 (blue) - Barcelona

Pennants:
- Default: #004D98 (blue) - Barcelona
- Tinted (index 1): 0xDA291C (red) - Manchester United

Menu Board (Chalkboard):
- Background: #2E4F2E (dark green)
- Frame: #5D4037 (brown)
- Text: #FFFFFF (white)

Trophy Shelf:
- Shelf: #5D4037 (brown)
- Trophy 1 (gold): #FFD700
- Trophy 2 (silver): #C0C0C0
- Trophy 3 (bronze): #CD7F32

Beer Mug:
- Cup: #BDBDBD (light gray)
- Beer: #FFC107 (gold)
- Foam: #fffde7 (light yellow)

Kitchen Door:
- Frame: #5D4037 (brown)
- Inner: #3E2723 (dark brown)
- Panel: #4E342E (dark brown)
- Window (porthole): #81D4FA (light blue)
- Door handle: #BDBDBD (light gray)
- Text: #FFFFFF (white)

TV Frame:
- Outer: #212121 (almost black)
- Bezel: #424242 (dark gray)
- Screen: #0D1B2A (very dark blue)
- Stand: #424242 (dark gray)
- Power LED: #4CAF50 (green)
```

---

## 5. Sprite Assets & Textures

### Character Spritesheets (Canvas-Generated)
```
Team Fans (48x48, 24 frames each)
- Frame 0-3: Walk animation (leg offset animation)
- Frame 4-9: Drink animation (beer mug movement)
- Frame 10-13: Idle animation (thinking bubble)
- Frame 14-19: Eat animation (fork/food movement)
- Frame 20-23: Phone animation (phone to ear)
- Color: team primary (jersey) + secondary (stripes)
- Body: skin #ffdbac, hair #4a3728, eyes #333333

Bartender (48x48, 8 frames)
- Frame 0-1: Idle (bobbing)
- Frame 2-3: Idle variants
- Frame 4-5: Preparing beer (mug animation)
- Frame 6-7: Wiping counter (cloth animation)
- Body: vest #333333, shirt #ffffff, pants #1a1a1a, bow tie #F44336

Waiter (48x48, 8 frames)
- Frame 0-3: Walking (leg offset)
- Frame 4-7: Carrying tray with beer tower
- Body: vest #8B0000, shirt #ffffff, pants #1a1a1a, bow tie #000000

Beer Tower (32x64, 5 frames)
- Frame 0: Full (>75% remaining)
- Frame 1: 75% remaining
- Frame 2: 50% remaining
- Frame 3: 25% remaining
- Frame 4: Empty (0%)
- Glass: #b3e5fc (light blue), Beer: #FFC107 (gold), Foam: #fffde7

Food Items (16x16, 10 frames)
- Frame 0: Beer mug
- Frame 1: Pizza
- Frame 2: Burger
- Frame 3: Coffee
- Frame 4: Sandwich
- Frame 5: Sushi
- Frame 6: Steak
- Frame 7: Salad
- Frame 8: Cake
- Frame 9: Wine
```

### Single-Frame Textures (Canvas-Generated)
```
Phone Booth (64x120)
- Structure: #5D4037 frame, #3e2723 inner, #81d4fa windows
- Rotary dial: #212121
- Cord: #757575
- Coin slot: #ffcc00
- Base label: #ffffff

Signs:
- Open Sign (48x24): green #4CAF50 with white squares
- Closed Sign (64x24): red #F44336 with white squares
- Rate-Limit Sign (80x32): orange #FF9800 with yellow center

Kitchen Door (80x120)
- See decoration colors above
- Features: porthole window, handle, "KITCHEN" label

TV Frame (180x100)
- See decoration colors above
- Purpose: Displays event log/visualization

Trophy Shelf (100x60)
- Gold, silver, bronze trophies on brown shelf

Scarf (20x50)
- Default: #DA291C (red) with #FFFFFF stripes
- Can be tinted to different colors

Pennant (30x40)
- Triangle shape
- Default: #004D98 (blue) with #A50044 (maroon) stripe
- Can be tinted

Photo Frame (40x50)
- Frame: #5D4037 brown
- Photo area: #9E9E9E gray
- Silhouette: #616161 (footballer)

Menu Board (60x80)
- See decoration colors (chalkboard style)
- Text lines: #FFFFFF chalk

Beer Glass (12x20)
- Glass: #E0E0E0, Beer: #FFC107, Foam: #FFFDE7
```

---

## 6. Sprite Positions in Scene

### PhoneBooth Sprite
```
Position: (60, 280)
- Sprite depth: 100 (very high for visibility)
- Status text offset: y+70
- Glow effect: blue (#2196F3) circle, 50-70px radius
- Animations when in use:
  - Glow fade in/out (300ms)
  - Booth pulse scale (1.05x, 500ms, repeating)
  - Status text alpha pulse (400ms, repeating)
```

### Bar Counter Decorations
```
Beer Glasses (5 total)
- Position: y=515 (just above counter at 520-530)
- X spacing: 150, 180, 210, 240, 270
- Sprite: 'beer-glass' (12x20)
- Depth: 120 (high, above counter)
- Origin: (0.5, 1) - bottom center
```

### Food Indicator
```
Position: barCounter.x, barCounter.y - 40
         = (400, 520)
- Shows current food delivery status
- Sprite: 'food' (16x16, multiframe)
```

### Bar Sign (Entrance)
```
Position: (750, 350)  // entrance.x, entrance.y - 100
- Depth: 90
- Updates dynamically (states: open/closed/rate-limited)
```

### Wall Decorations
```
Trophy Shelf: (150, 100)
- Depth: 10

Scarves:
- Left: (80, 150), Origin (0.5, 0), Depth 10
- Right: (580, 150), tinted blue, Origin (0.5, 0), Depth 10

Pennants:
- Left: (250, 80), Origin (0.5, 0), Depth 10
- Right: (550, 80), tinted red, Origin (0.5, 0), Depth 10

Photo Frames:
- Left: (320, 180), Origin (0.5, 0.5), Depth 10
- Right: (480, 180), Origin (0.5, 0.5), Depth 10

Menu Board:
- Position: (200, 520)
- Origin: (0.5, 1) - bottom center
- Depth: 90 (above counter level)
```

### TV & Display
```
TV Frame: (400, 120)
- Origin: (0.5, 0.5)
- Depth: 90
- Size: 180x100

TVDisplay Component:
- Overlaid on TV frame
- Displays event log/livestream
```

---

## 7. Customer/Session Sprite Details

### SessionCustomer Structure
```
Position: Starts at entrance (750, 450), walks to seat
- Sprite Key: team.spriteKey (e.g., 'fan-mu')
- Origin: (0.5, 1) - bottom center

Child Elements:
1. beerTower (Sprite 'beer-tower')
   - Local offset: (30, -10)
   - Scale: 0.8
   - Initial: hidden until delivery
   - Frame: 0 (full)

2. nameTag (Text)
   - Offset: y=-58 (above head)
   - Shows: last 6 chars of sessionId
   - Background: team.primary color
   - Padding: x=3, y=1

3. teamBadge (Graphics)
   - Position: (-5, -70)
   - Size: 10x10
   - Fill: team.secondary color
   - Border: team.primary color (1px)

4. contextLabel (Text)
   - Offset: y=25 (below table)
   - Shows: "Remaining: X%"
   - Colors: green/yellow/red based on level
   - Initial: hidden

5. tokensLabel (Text)
   - Offset: y=38
   - Shows: formatted token count
   - Color: #AAAAAA
   - Initial: hidden
```

### Customer Animations
- **Walk:** 1500ms from entrance to seat, bobbing animation
- **Idle:** Default sitting animation (frames 10-13)
- **Drink:** When beer delivered (frames 4-9)
- **Eat:** When food arrives (frames 14-19)
- **Phone:** At phone booth (frames 20-23)
- **Leaving:** 1200ms exit animation

### Beer Tower Management
- Detaches from container when customer walks to phone booth
- Stays at table position during customer's call
- Re-attaches when customer returns
- Context labels move with beer tower

---

## 8. Asset Definition Pipeline

### Texture Creation (PreloadScene.preload())
```
1. Canvas-based spritesheet generation
2. Dynamic frame rendering for each animation
3. Registration in Phaser texture manager
4. No external asset files needed (all generated)

Process:
- Create canvas element
- Draw each frame at correct position
- Use ctx.save()/restore() for frame boundaries
- Register with this.textures.addSpriteSheet() or addImage()
```

### Texture Types

**Spritesheets:**
- Team fans: dynamic dimensions per team
- Bartender, Waiter, Beer Tower, Food items
- All 48x48 or 32x64, multiframe

**Single Images:**
- Phone booth, signs, kitchen door, TV frame
- Trophy shelf, scarves, pennants, photo frames
- Menu board, beer glass

---

## 9. HTML/Document Configuration

### Page Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Robot Runner CC</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background: #1a1a2e">
  <div id="game-container" style="border: 4px solid #4a4e69"></div>
  <script type="module" src="/src/client/main.ts"></script>
</body>
```

### CSS Styling
- Body background: `#1a1a2e` (dark navy)
- Container border: `4px solid #4a4e69` (muted purple-blue)
- Border radius: `8px`
- Box shadow: `0 0 20px rgba(0, 0, 0, 0.5)`
- Flexbox centered on screen

---

## 10. Scene Setup Flow

### 1. PreloadScene (Preload Phase)
- Generate all textures dynamically
- Register team spritesheets (8 teams)
- Register NPC spritesheets (bartender, waiter)
- Register single-frame sprites (decorations, signs)
- Delay 100ms for texture manager to process
- Transition to BarScene

### 2. BarScene (Main Game)
- `createBackground()` - Draw floor, walls, wall panels, accent stripes
- `createDecorations()` - Add trophy shelf, scarves, pennants, photos, menu board, beer glasses
- `createFurniture()` - Draw tables (8), bar counter, beer taps, phone booth, entrance door
- `createTV()` - Add TV frame and TVDisplay component
- Initialize managers:
  - SessionCustomerManager (8 table limit)
  - SubAgentManager (near-table positions)
  - SpeechBubblePool (10 bubbles)
- Setup socket listeners for game events
- Connect to server via socketClient

### 3. HUDScene (Overlay)
- Runs in parallel with BarScene
- UI overlays, status displays

---

## 11. Key Technical Details

### Depth/Layering System
```
0: Background (floor, walls)
10: Wall decorations (trophy shelf, photos, etc.)
50: Furniture (kitchen door)
90: UI elements (menu board, TV frame, bar sign)
100-120: High-priority UI (phone booth, beer glasses)
seatY: Customers set depth = table Y for natural sorting
```

### Graphics Drawing System
- Uses `this.add.graphics()` for procedural shapes
- All bar furniture drawn with graphics (tables, counter, entrance)
- Floor planks with line pattern
- No external sprite files required

### Animation System
- Frame-based sprite animations
- Tweens for movement and visual effects
- Event listeners for animation completion
- Queue system for multiple drink/eat actions

### State Management
- `barState` central event emitter
- Events: session:open/close, context:update, mcp:start/end, skill:use
- SessionCustomerManager listens and updates visuals
- PhoneBooth listens for MCP events

---

## 12. Color Reference Summary

### HTML/UI Colors
```
Dark background: #1a1a2e
Border/accent: #4a4e69
Phone booth: #2196F3 (blue)
Context high: #4CAF50 (green)
Context med: #FFC107 (amber)
Context low: #F44336 (red)
```

### Bar Environment (Hex)
```
Walls: 0x5D4037 (brown)
Floor: 0xA1887F to 0x8D6E63 (tan/brown gradient)
Counter: 0x3E2723 (dark brown)
Furniture: 0x5D4037, 0x4E342E (browns)
Accent: 0x8D6E63 (tan)
```

### All Team Primary Colors
```
Manchester United: #DA291C
Chelsea: #034694
Arsenal: #EF0107
Real Madrid: #FFFFFF
Barcelona: #004D98
Juventus: #000000
AC Milan: #FB090B
Liverpool: #C8102E
```

---

## Unresolved Questions

1. **Asset Positioning Precision:** Are the exact pixel positions in `positions` object finalized, or subject to UI layout adjustments?
2. **Depth/Sorting Complexity:** Are there edge cases with depth sorting when many customers are seated and animating simultaneously?
3. **Color Contrast:** Are there accessibility considerations for color-blind users in the team color selection?
4. **Performance:** Are there optimization considerations for rendering 8 team-colored sprites simultaneously with animations?
5. **TV Display:** What's the complete display format and update frequency for the TVDisplay component?


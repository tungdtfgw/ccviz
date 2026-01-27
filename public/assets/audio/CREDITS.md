# Audio Asset Credits

## Background Music (BGM)

### Recommended Tracks from HoliznaCC0 (CC0 1.0 Universal)
Source: https://freemusicarchive.org/music/holiznacc0/chiptunes

Choose ONE of these 80s-style chiptune tracks:
- **Level 1** (1:48) - https://freemusicarchive.org/music/holiznacc0/chiptunes/level-1
- **ICE temple** (1:44) - https://freemusicarchive.org/music/holiznacc0/chiptunes/ice-temple
- **Sunny Afternoon** (1:55) - https://freemusicarchive.org/music/holiznacc0/chiptunes/sunny-afternoon
- **Level 2** (2:02) - https://freemusicarchive.org/music/holiznacc0/chiptunes/level-2

**License:** CC0 1.0 Universal (Public Domain)
**Artist:** HoliznaCC0
**Attribution:** Not required (but appreciated!)

---

## Sound Effects (SFX)

### Door Sounds
**Source:** Freesound.org
**Recommended:**
- Door Open/Close by amholma: https://freesound.org/s/344360/
- Alternative: Mixkit doors library: https://mixkit.co/free-sound-effects/doors/

**License:** CC0 or royalty-free

### Footsteps
**Source:** Freesound.org / OpenGameArt.org
**Recommended:**
- Browse CC0 footstep sounds: https://freesound.org/browse/tags/footsteps/
- CC0 Sound Effects: https://opengameart.org/content/cc0-sound-effects

**License:** CC0

### Kitchen Door
**Source:** Freesound.org
**Recommended:**
- Sci-Fi Doors/Airlock by RyanKingArt: https://freesound.org/people/RyanKingArt/sounds/607265/
- Browse door sounds: https://freesound.org/browse/tags/door/

**License:** CC0

---

## Installation Instructions

1. **Download BGM:**
   - Visit the HoliznaCC0 chiptunes album link above
   - Download one track (e.g., "Level 1")
   - Save as: `public/assets/audio/music/bgm-80s-chiptune.mp3`

2. **Download SFX:**
   - Visit Freesound.org links above
   - Download the following sounds:
     - `door-open.wav`
     - `door-close.wav`
     - `footstep-1.wav`, `footstep-2.wav`, `footstep-3.wav`
     - `kitchen-door.wav`

3. **Convert to MP3 and OGG:**
   ```bash
   # Convert BGM
   ffmpeg -i bgm-80s-chiptune.mp3 -c:a libvorbis -q:a 4 public/assets/audio/music/bgm-80s-chiptune.ogg

   # Convert SFX (repeat for each file)
   ffmpeg -i door-open.wav -b:a 128k public/assets/audio/sfx/door-open.mp3
   ffmpeg -i door-open.wav -c:a libvorbis -q:a 4 public/assets/audio/sfx/door-open.ogg

   # Repeat for all SFX files
   ```

4. **File Structure:**
   ```
   public/assets/audio/
   ├── music/
   │   ├── bgm-80s-chiptune.mp3
   │   └── bgm-80s-chiptune.ogg
   └── sfx/
       ├── door-open.mp3
       ├── door-open.ogg
       ├── door-close.mp3
       ├── door-close.ogg
       ├── footstep-1.mp3
       ├── footstep-1.ogg
       ├── footstep-2.mp3
       ├── footstep-2.ogg
       ├── footstep-3.mp3
       ├── footstep-3.ogg
       ├── kitchen-door.mp3
       └── kitchen-door.ogg
   ```

---

## Alternative: Generate Placeholder Audio

If you need to test integration before sourcing real audio, you can generate silent placeholder files:

```bash
# Generate 2-second silent MP3 placeholders
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 2 -q:a 9 public/assets/audio/music/bgm-80s-chiptune.mp3
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 public/assets/audio/sfx/door-open.mp3
# Repeat for other SFX...

# Convert to OGG
ffmpeg -i public/assets/audio/music/bgm-80s-chiptune.mp3 -c:a libvorbis -q:a 4 public/assets/audio/music/bgm-80s-chiptune.ogg
# Repeat for SFX...
```

**Note:** Replace placeholders with real audio before production deployment!

---

## License Summary

All recommended audio assets use **CC0 1.0 Universal (Public Domain)** or royalty-free licenses, allowing:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ No attribution required (though appreciated)

Verify the specific license on each source before downloading.

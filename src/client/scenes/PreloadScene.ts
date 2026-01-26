import Phaser from 'phaser';
import { TEAMS, type TeamConfig } from '@shared/teams';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Create all textures synchronously
    this.createAllTextures();
  }

  // Create all textures directly via texture manager
  private createAllTextures() {
    // Team spritesheets (8 teams)
    TEAMS.forEach(team => {
      this.createTeamSpritesheet(team);
    });

    // NPC and character spritesheets
    this.createSpritesheet('main-agent', 32, 48, 14, this.drawMainAgentFrame.bind(this));
    this.createSpritesheet('customer', 32, 48, 10, this.drawCustomerFrame.bind(this));
    this.createSpritesheet('bartender', 48, 48, 8, this.drawBartenderFrame48.bind(this));
    this.createSpritesheet('waiter', 48, 48, 8, this.drawWaiterFrame48.bind(this));
    this.createSpritesheet('beer-tower', 32, 64, 5, this.drawBeerTowerFrame.bind(this));
    this.createSpritesheet('food', 16, 16, 10, this.drawFoodFrame.bind(this));

    // Simple textures
    this.createSimpleTexture('beer-mug', 16, 20, this.drawBeerMug.bind(this));
    this.createSimpleTexture('sign-open', 48, 24, this.drawOpenSign.bind(this));
    this.createSimpleTexture('sign-closed', 64, 24, this.drawClosedSign.bind(this));
    this.createSimpleTexture('sign-rate-limit', 80, 32, this.drawRateLimitSign.bind(this));
    this.createSimpleTexture('table', 80, 48, this.drawTable.bind(this));
    this.createSimpleTexture('kitchen-door', 80, 120, this.drawKitchenDoor.bind(this));
    this.createSimpleTexture('tv-frame', 180, 100, this.drawTVFrame.bind(this));
    this.createSimpleTexture('trophy-worldcup', 36, 50, this.drawTrophyWorldCup.bind(this));
    this.createSimpleTexture('trophy-champions', 40, 50, this.drawTrophyChampions.bind(this));
    this.createSimpleTexture('trophy-premier', 36, 50, this.drawTrophyPremier.bind(this));
    this.createSimpleTexture('photo-frame-1', 40, 50, this.drawPhotoFrame1.bind(this));
    this.createSimpleTexture('photo-frame-2', 40, 50, this.drawPhotoFrame2.bind(this));
    this.createSimpleTexture('photo-frame-3', 40, 50, this.drawPhotoFrame3.bind(this));
    this.createSimpleTexture('beer-glass', 12, 20, this.drawBeerGlass.bind(this));
    this.createSimpleTexture('bottle', 10, 28, this.drawBottle.bind(this));
    this.createSimpleTexture('desk-phone', 32, 24, this.drawDeskPhone.bind(this));
    this.createSimpleTexture('speaker-system', 120, 30, this.drawSpeakerSystem.bind(this));
  }

  // Create team spritesheet (48x48, 24 frames)
  private createTeamSpritesheet(team: TeamConfig) {
    const frameWidth = 48;
    const frameHeight = 48;
    const frameCount = 24;

    const canvas = document.createElement('canvas');
    canvas.width = frameWidth * frameCount;
    canvas.height = frameHeight;
    const ctx = canvas.getContext('2d')!;

    for (let i = 0; i < frameCount; i++) {
      ctx.save();
      ctx.translate(i * frameWidth, 0);
      this.drawFanFrame48(ctx, i, team.primary, team.secondary);
      ctx.restore();
    }

    // Phaser accepts canvas elements despite TypeScript types
    this.textures.addSpriteSheet(team.spriteKey, canvas as unknown as HTMLImageElement, { frameWidth, frameHeight });
  }

  // Create spritesheet from frame drawer
  private createSpritesheet(
    key: string,
    frameWidth: number,
    frameHeight: number,
    frameCount: number,
    drawFrame: (ctx: CanvasRenderingContext2D, frameIndex: number) => void
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = frameWidth * frameCount;
    canvas.height = frameHeight;
    const ctx = canvas.getContext('2d')!;

    for (let i = 0; i < frameCount; i++) {
      ctx.save();
      ctx.translate(i * frameWidth, 0);
      drawFrame(ctx, i);
      ctx.restore();
    }

    this.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, { frameWidth, frameHeight });
  }

  // Create simple single-frame texture
  private createSimpleTexture(
    key: string,
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    draw(ctx);
    this.textures.addImage(key, canvas as unknown as HTMLImageElement);
  }


  // Draw football fan with team jersey + shorts
  private drawFanFrame(ctx: CanvasRenderingContext2D, i: number, primary: string, secondary: string) {
    const yBob = (i % 4 < 2) ? 0 : 1;
    const isWalking = i < 4;
    const isDrinking = i >= 4 && i <= 9;
    const isIdle = i >= 10;
    const walkOffset = isWalking ? ((i % 2 === 0) ? -1 : 1) : 0;

    // Legs walking animation
    const legOffset = isWalking ? (i % 2 === 0 ? 2 : -2) : 0;

    // Skin color
    ctx.fillStyle = '#ffdbac';

    // Head
    ctx.fillRect(10 + walkOffset, 4 + yBob, 12, 12);

    // Hair
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(10 + walkOffset, 2 + yBob, 12, 4);

    // Eyes
    ctx.fillStyle = '#333333';
    ctx.fillRect(12 + walkOffset, 8 + yBob, 2, 2);
    ctx.fillRect(18 + walkOffset, 8 + yBob, 2, 2);

    // Jersey (team primary color)
    ctx.fillStyle = primary;
    ctx.fillRect(8, 16 + yBob, 16, 14);

    // Jersey stripes (team secondary color)
    ctx.fillStyle = secondary;
    ctx.fillRect(8, 20 + yBob, 16, 2);
    ctx.fillRect(8, 26 + yBob, 16, 2);

    // Jersey collar
    ctx.fillStyle = secondary;
    ctx.fillRect(12, 16 + yBob, 8, 2);

    // Shorts (team secondary color, darker)
    ctx.fillStyle = secondary;
    ctx.fillRect(8, 30 + yBob, 16, 8);

    // Left leg
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(8 + legOffset, 38 + yBob, 6, 6);

    // Right leg
    ctx.fillRect(18 - legOffset, 38 + yBob, 6, 6);

    // Socks (team primary)
    ctx.fillStyle = primary;
    ctx.fillRect(8 + legOffset, 42 + yBob, 6, 4);
    ctx.fillRect(18 - legOffset, 42 + yBob, 6, 4);

    // Arms
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(4, 18 + yBob, 4, 10);
    ctx.fillRect(24, 18 + yBob, 4, 10);

    // Drinking animation
    if (isDrinking) {
      const mugPhase = i - 4;
      const mugY = mugPhase < 3 ? 18 - mugPhase * 2 : 18 - (5 - mugPhase) * 2;
      // Beer mug
      ctx.fillStyle = '#BDBDBD';
      ctx.fillRect(24, mugY + yBob, 6, 8);
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(25, mugY + 2 + yBob, 4, 5);
      // Foam
      ctx.fillStyle = '#fffde7';
      ctx.fillRect(25, mugY + yBob, 4, 2);
    }

    // Idle thinking bubble
    if (isIdle) {
      const bubblePhase = i - 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20 + (bubblePhase % 2), 0, 10, 6);
      ctx.fillStyle = '#333333';
      ctx.fillRect(22 + (bubblePhase % 2), 2, 1, 1);
      ctx.fillRect(24 + (bubblePhase % 2), 2, 1, 1);
      ctx.fillRect(26 + (bubblePhase % 2), 2, 1, 1);
    }
  }

  // Draw 48x48 football fan with enhanced detail (24 frames)
  // Frame map: 0-3 walk, 4-9 drink, 10-13 idle, 14-19 eat, 20-23 phone
  private drawFanFrame48(ctx: CanvasRenderingContext2D, i: number, primary: string, secondary: string) {
    const yBob = (i % 4 < 2) ? 0 : 1;
    const isWalking = i < 4;
    const isDrinking = i >= 4 && i <= 9;
    const isIdle = i >= 10 && i <= 13;
    const isEating = i >= 14 && i <= 19;
    const isPhoning = i >= 20 && i <= 23;
    const walkOffset = isWalking ? ((i % 2 === 0) ? -1 : 1) : 0;
    const legOffset = isWalking ? (i % 2 === 0 ? 3 : -3) : 0;

    // Head (16x16 at center top)
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(16 + walkOffset, 4 + yBob, 16, 16);

    // Hair
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(16 + walkOffset, 2 + yBob, 16, 6);

    // Eyes
    ctx.fillStyle = '#333333';
    ctx.fillRect(19 + walkOffset, 10 + yBob, 3, 3);
    ctx.fillRect(26 + walkOffset, 10 + yBob, 3, 3);

    // Jersey (team primary color) - larger body
    ctx.fillStyle = primary;
    ctx.fillRect(12, 20 + yBob, 24, 16);

    // Jersey stripes (team secondary color)
    ctx.fillStyle = secondary;
    ctx.fillRect(12, 24 + yBob, 24, 3);
    ctx.fillRect(12, 30 + yBob, 24, 3);

    // Jersey collar
    ctx.fillStyle = secondary;
    ctx.fillRect(18, 20 + yBob, 12, 3);

    // Shorts (team secondary color)
    ctx.fillStyle = secondary;
    ctx.fillRect(12, 36 + yBob, 24, 6);

    // Left leg
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(12 + legOffset, 42 + yBob, 8, 4);

    // Right leg
    ctx.fillRect(28 - legOffset, 42 + yBob, 8, 4);

    // Socks (team primary)
    ctx.fillStyle = primary;
    ctx.fillRect(12 + legOffset, 44 + yBob, 8, 4);
    ctx.fillRect(28 - legOffset, 44 + yBob, 8, 4);

    // Arms
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(6, 22 + yBob, 6, 12);
    ctx.fillRect(36, 22 + yBob, 6, 12);

    // Drinking animation (frames 4-9)
    if (isDrinking) {
      const mugPhase = i - 4;
      const mugY = mugPhase < 3 ? 20 - mugPhase * 3 : 20 - (5 - mugPhase) * 3;
      // Beer mug
      ctx.fillStyle = '#BDBDBD';
      ctx.fillRect(36, mugY + yBob, 8, 12);
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(37, mugY + 3 + yBob, 6, 8);
      // Foam
      ctx.fillStyle = '#fffde7';
      ctx.fillRect(37, mugY + yBob, 6, 3);
    }

    // Idle thinking bubble (frames 10-13)
    if (isIdle) {
      const bubblePhase = i - 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(30 + (bubblePhase % 2), 0, 14, 8);
      ctx.fillStyle = '#333333';
      ctx.fillRect(33 + (bubblePhase % 2), 3, 2, 2);
      ctx.fillRect(36 + (bubblePhase % 2), 3, 2, 2);
      ctx.fillRect(39 + (bubblePhase % 2), 3, 2, 2);
    }

    // Eating animation (frames 14-19)
    if (isEating) {
      const eatPhase = i - 14;
      // Fork/food movement toward mouth
      const foodY = eatPhase < 2 ? 34 : (eatPhase < 4 ? 24 : 14);
      ctx.fillStyle = '#795548'; // Food plate color
      ctx.fillRect(36, foodY + yBob, 10, 8);
      ctx.fillStyle = '#8BC34A'; // Food on plate
      ctx.fillRect(38, foodY + 2 + yBob, 6, 4);
      // Chewing animation on face
      if (eatPhase >= 4) {
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(20, 14 + yBob, 8, 4);
      }
    }

    // Phone animation (frames 20-23)
    if (isPhoning) {
      const phonePhase = i - 20;
      // Phone held to ear
      ctx.fillStyle = '#333333';
      ctx.fillRect(36 + (phonePhase % 2), 8 + yBob, 8, 14);
      // Phone screen glow
      ctx.fillStyle = '#81D4FA';
      ctx.fillRect(37 + (phonePhase % 2), 10 + yBob, 6, 10);
    }
  }


  private drawMainAgentFrame(ctx: CanvasRenderingContext2D, i: number) {
    const yBob = (i % 4 < 2) ? 0 : 1;
    ctx.fillStyle = '#4a90d9';
    ctx.fillRect(8, 16 + yBob, 16, 16);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(8, 32 + yBob, 16, 12);
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(10, 4 + yBob, 12, 12);
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(10, 2 + yBob, 12, 4);
    ctx.fillStyle = '#333333';
    ctx.fillRect(12, 8 + yBob, 2, 2);
    ctx.fillRect(18, 8 + yBob, 2, 2);

    if (i >= 4 && i <= 9) {
      const mugPhase = i - 4;
      const mugY = mugPhase < 3 ? 18 - mugPhase * 2 : 18 - (5 - mugPhase) * 2;
      ctx.fillStyle = '#BDBDBD';
      ctx.fillRect(22, mugY + yBob, 6, 8);
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(23, mugY + 2 + yBob, 4, 5);
    }

    if (i >= 10 && i <= 13) {
      const bubblePhase = i - 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20 + (bubblePhase % 2), 0, 8, 6);
      ctx.fillStyle = '#333333';
      ctx.fillRect(22 + (bubblePhase % 2), 2, 1, 1);
      ctx.fillRect(24 + (bubblePhase % 2), 2, 1, 1);
      ctx.fillRect(26 + (bubblePhase % 2), 2, 1, 1);
    }
  }

  private drawCustomerFrame(ctx: CanvasRenderingContext2D, i: number) {
    const colors = [
      { skin: '#ffdbac', shirt: '#9c27b0', pants: '#1a237e' },
      { skin: '#d4a574', shirt: '#e91e63', pants: '#263238' },
      { skin: '#8d5524', shirt: '#00bcd4', pants: '#37474f' }
    ];
    const c = colors[i % 3];
    const yBob = (i % 4 < 2) ? 0 : 1;
    const walkOffset = (i < 4) ? (i % 2 === 0 ? -2 : 2) : 0;

    ctx.fillStyle = c.shirt;
    ctx.fillRect(8, 16 + yBob, 16, 16);
    ctx.fillStyle = c.pants;
    ctx.fillRect(8, 32 + yBob, 16, 12);
    ctx.fillStyle = c.skin;
    ctx.fillRect(10 + walkOffset, 4 + yBob, 12, 12);
    ctx.fillStyle = '#333333';
    ctx.fillRect(12 + walkOffset, 8 + yBob, 2, 2);
    ctx.fillRect(18 + walkOffset, 8 + yBob, 2, 2);

    if (i >= 6 && i <= 9) {
      ctx.fillStyle = '#BDBDBD';
      ctx.fillRect(22, 16 + yBob, 6, 8);
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(23, 18 + yBob, 4, 5);
    }
  }

  private drawBartenderFrame(ctx: CanvasRenderingContext2D, i: number) {
    const yBob = (i % 2 === 0) ? 0 : 1;
    const isPreparing = i >= 4 && i <= 5;
    const isWiping = i >= 6 && i <= 7;

    // Vest (black)
    ctx.fillStyle = '#333333';
    ctx.fillRect(8, 16 + yBob, 16, 16);

    // Shirt (white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 18 + yBob, 12, 12);

    // Pants (black)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(8, 32 + yBob, 16, 12);

    // Head
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(10, 4 + yBob, 12, 12);

    // Mustache
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(12, 12 + yBob, 8, 2);

    // Eyes
    ctx.fillStyle = '#333333';
    ctx.fillRect(12, 8 + yBob, 2, 2);
    ctx.fillRect(18, 8 + yBob, 2, 2);

    // Bow tie
    ctx.fillStyle = '#F44336';
    ctx.fillRect(14, 16 + yBob, 4, 2);

    // Arms
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 18 + yBob, 4, 10);
    ctx.fillRect(24, 18 + yBob, 4, 10);

    // Preparing beer animation
    if (isPreparing) {
      ctx.fillStyle = '#BDBDBD';
      ctx.fillRect(26, 20 + yBob, 6, 10);
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(27, 24 + yBob, 4, 5);
    }

    // Wiping counter animation
    if (isWiping) {
      ctx.fillStyle = '#9E9E9E';
      ctx.fillRect(26, 26 + yBob + (i % 2) * 2, 6, 4);
    }
  }

  private drawWaiterFrame(ctx: CanvasRenderingContext2D, i: number) {
    const yBob = (i % 4 < 2) ? 0 : 1;
    const isWalking = i < 4;
    const isCarrying = i >= 4;
    const legOffset = isWalking ? (i % 2 === 0 ? 2 : -2) : 0;

    // Vest (burgundy)
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(8, 16 + yBob, 16, 14);

    // Shirt (white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 18 + yBob, 12, 10);

    // Pants (black)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(8, 30 + yBob, 16, 8);

    // Legs
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(8 + legOffset, 38 + yBob, 6, 6);
    ctx.fillRect(18 - legOffset, 38 + yBob, 6, 6);

    // Head
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(10, 4 + yBob, 12, 12);

    // Hair
    ctx.fillStyle = '#2c1810';
    ctx.fillRect(10, 2 + yBob, 12, 4);

    // Eyes
    ctx.fillStyle = '#333333';
    ctx.fillRect(12, 8 + yBob, 2, 2);
    ctx.fillRect(18, 8 + yBob, 2, 2);

    // Bow tie
    ctx.fillStyle = '#000000';
    ctx.fillRect(14, 16 + yBob, 4, 2);

    // Arms
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 18 + yBob, 4, 10);
    ctx.fillRect(24, 18 + yBob, 4, 10);

    // Carrying tray with beer tower
    if (isCarrying) {
      // Tray
      ctx.fillStyle = '#795548';
      ctx.fillRect(24, 14 + yBob, 8, 2);
      // Beer tower on tray
      ctx.fillStyle = '#b3e5fc';
      ctx.fillRect(25, 4 + yBob, 6, 10);
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(26, 6 + yBob, 4, 7);
    }
  }

  // 48x48 Bartender with enhanced detail
  private drawBartenderFrame48(ctx: CanvasRenderingContext2D, i: number) {
    const yBob = (i % 2 === 0) ? 0 : 1;
    const isPreparing = i >= 4 && i <= 5;
    const isWiping = i >= 6 && i <= 7;

    // Vest (black) - larger
    ctx.fillStyle = '#333333';
    ctx.fillRect(12, 20 + yBob, 24, 18);

    // Shirt (white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 22 + yBob, 20, 14);

    // Pants (black)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(12, 38 + yBob, 24, 8);

    // Head (16x16)
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(16, 4 + yBob, 16, 16);

    // Mustache
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(18, 16 + yBob, 12, 3);

    // Eyes
    ctx.fillStyle = '#333333';
    ctx.fillRect(19, 10 + yBob, 3, 3);
    ctx.fillRect(26, 10 + yBob, 3, 3);

    // Bow tie (red)
    ctx.fillStyle = '#F44336';
    ctx.fillRect(20, 20 + yBob, 8, 3);

    // Arms
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 22 + yBob, 6, 14);
    ctx.fillRect(36, 22 + yBob, 6, 14);

    // Preparing beer animation
    if (isPreparing) {
      ctx.fillStyle = '#BDBDBD';
      ctx.fillRect(38, 24 + yBob, 8, 14);
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(39, 30 + yBob, 6, 7);
    }

    // Wiping counter animation
    if (isWiping) {
      ctx.fillStyle = '#9E9E9E';
      ctx.fillRect(38, 32 + yBob + (i % 2) * 3, 8, 6);
    }
  }

  // 48x48 Waiter with enhanced detail
  private drawWaiterFrame48(ctx: CanvasRenderingContext2D, i: number) {
    const yBob = (i % 4 < 2) ? 0 : 1;
    const isWalking = i < 4;
    const isCarrying = i >= 4;
    const legOffset = isWalking ? (i % 2 === 0 ? 3 : -3) : 0;

    // Vest (burgundy) - larger
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(12, 20 + yBob, 24, 16);

    // Shirt (white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 22 + yBob, 20, 12);

    // Pants (black)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(12, 36 + yBob, 24, 8);

    // Legs
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(12 + legOffset, 42 + yBob, 8, 6);
    ctx.fillRect(28 - legOffset, 42 + yBob, 8, 6);

    // Head (16x16)
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(16, 4 + yBob, 16, 16);

    // Hair
    ctx.fillStyle = '#2c1810';
    ctx.fillRect(16, 2 + yBob, 16, 6);

    // Eyes
    ctx.fillStyle = '#333333';
    ctx.fillRect(19, 10 + yBob, 3, 3);
    ctx.fillRect(26, 10 + yBob, 3, 3);

    // Bow tie (black)
    ctx.fillStyle = '#000000';
    ctx.fillRect(20, 20 + yBob, 8, 3);

    // Arms
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 22 + yBob, 6, 14);
    ctx.fillRect(36, 22 + yBob, 6, 14);

    // Carrying tray with beer tower
    if (isCarrying) {
      // Tray
      ctx.fillStyle = '#795548';
      ctx.fillRect(36, 18 + yBob, 12, 3);
      // Beer tower on tray
      ctx.fillStyle = '#b3e5fc';
      ctx.fillRect(38, 6 + yBob, 8, 12);
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(39, 8 + yBob, 6, 9);
    }
  }

  private drawBeerTowerFrame(ctx: CanvasRenderingContext2D, i: number) {
    const levels = [1.0, 0.75, 0.5, 0.25, 0.0];
    const level = levels[i];

    ctx.fillStyle = '#b3e5fc';
    ctx.fillRect(4, 8, 24, 52);

    if (level > 0) {
      const fillHeight = Math.floor(48 * level);
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(6, 8 + (48 - fillHeight), 20, fillHeight);
      ctx.fillStyle = '#fffde7';
      ctx.fillRect(6, 8 + (48 - fillHeight) - 4, 20, 4);
    }

    ctx.fillStyle = '#795548';
    ctx.fillRect(12, 0, 8, 10);
    ctx.fillStyle = '#ffc107';
    ctx.fillRect(14, 2, 4, 4);
  }

  private drawFoodFrame(ctx: CanvasRenderingContext2D, i: number) {
    const foods = [
      () => { // Beer
        ctx.fillStyle = '#BDBDBD'; ctx.fillRect(3, 4, 8, 10);
        ctx.fillStyle = '#FFC107'; ctx.fillRect(4, 6, 6, 7);
        ctx.fillStyle = '#fffde7'; ctx.fillRect(4, 4, 6, 2);
      },
      () => { // Pizza
        ctx.fillStyle = '#FFEB3B'; ctx.fillRect(2, 6, 12, 8);
        ctx.fillStyle = '#F44336'; ctx.fillRect(4, 8, 3, 3); ctx.fillRect(8, 7, 3, 3);
      },
      () => { // Burger
        ctx.fillStyle = '#D7CCC8'; ctx.fillRect(2, 4, 12, 3);
        ctx.fillStyle = '#795548'; ctx.fillRect(2, 7, 12, 4);
        ctx.fillStyle = '#8BC34A'; ctx.fillRect(2, 11, 12, 2);
        ctx.fillStyle = '#D7CCC8'; ctx.fillRect(2, 13, 12, 3);
      },
      () => { // Coffee
        ctx.fillStyle = '#ffffff'; ctx.fillRect(4, 4, 8, 10);
        ctx.fillStyle = '#5D4037'; ctx.fillRect(5, 6, 6, 7);
      },
      () => { // Sandwich
        ctx.fillStyle = '#FFCC80'; ctx.fillRect(2, 6, 12, 8);
        ctx.fillStyle = '#8BC34A'; ctx.fillRect(3, 8, 10, 2);
        ctx.fillStyle = '#F48FB1'; ctx.fillRect(3, 10, 10, 2);
      },
      () => { // Sushi
        ctx.fillStyle = '#212121'; ctx.fillRect(4, 5, 8, 10);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(5, 6, 6, 4);
        ctx.fillStyle = '#FF5722'; ctx.fillRect(6, 7, 4, 2);
      },
      () => { // Steak
        ctx.fillStyle = '#8D6E63'; ctx.fillRect(2, 5, 12, 10);
        ctx.fillStyle = '#D7CCC8'; ctx.fillRect(4, 8, 3, 4);
      },
      () => { // Salad
        ctx.fillStyle = '#E8F5E9'; ctx.fillRect(3, 5, 10, 10);
        ctx.fillStyle = '#8BC34A'; ctx.fillRect(4, 6, 4, 4); ctx.fillRect(8, 8, 4, 4);
        ctx.fillStyle = '#F44336'; ctx.fillRect(6, 10, 2, 2);
      },
      () => { // Cake
        ctx.fillStyle = '#FCE4EC'; ctx.fillRect(3, 6, 10, 10);
        ctx.fillStyle = '#E91E63'; ctx.fillRect(4, 4, 8, 3);
        ctx.fillStyle = '#FFEB3B'; ctx.fillRect(7, 2, 2, 4);
      },
      () => { // Wine
        ctx.fillStyle = '#9e9e9e'; ctx.fillRect(6, 12, 4, 4); ctx.fillRect(7, 8, 2, 4);
        ctx.fillStyle = '#7B1FA2'; ctx.fillRect(5, 2, 6, 7);
      }
    ];
    foods[i]();
  }

  private drawBeerMug(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#BDBDBD';
    ctx.fillRect(2, 4, 10, 14);
    ctx.fillRect(12, 6, 3, 10);
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(13, 8, 2, 6);
    ctx.fillStyle = '#FFC107';
    ctx.fillRect(3, 6, 8, 11);
    ctx.fillStyle = '#fffde7';
    ctx.fillRect(3, 4, 8, 3);
  }

  private drawOpenSign(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, 0, 48, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 8, 8, 8);
    ctx.fillRect(14, 8, 8, 8);
    ctx.fillRect(24, 8, 8, 8);
    ctx.fillRect(34, 8, 8, 8);
  }

  private drawClosedSign(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#F44336';
    ctx.fillRect(0, 0, 64, 24);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) ctx.fillRect(8 + i * 8, 8, 6, 8);
  }

  private drawRateLimitSign(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#FF9800';
    ctx.fillRect(0, 0, 80, 32);
    ctx.fillStyle = '#333333';
    ctx.fillRect(4, 4, 72, 24);
    ctx.fillStyle = '#FFEB3B';
    ctx.fillRect(8, 8, 64, 16);
  }

  private drawTable(ctx: CanvasRenderingContext2D) {
    // Table top
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(0, 16, 80, 32);

    // Table shadow
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(4, 44, 72, 4);

    // Table legs
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(8, 40, 8, 8);
    ctx.fillRect(64, 40, 8, 8);
  }

  private drawKitchenDoor(ctx: CanvasRenderingContext2D) {
    // Door frame (wood)
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(0, 0, 80, 120);

    // Door inner frame
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(8, 8, 64, 104);

    // Door panels (two)
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(12, 12, 56, 45);
    ctx.fillRect(12, 62, 56, 45);

    // Circular window (porthole)
    ctx.fillStyle = '#81D4FA';
    ctx.beginPath();
    ctx.arc(40, 35, 18, 0, Math.PI * 2);
    ctx.fill();

    // Window frame
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(40, 35, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Door handle
    ctx.fillStyle = '#BDBDBD';
    ctx.fillRect(60, 60, 8, 4);
    ctx.fillRect(64, 58, 4, 8);

    // "KITCHEN" label at bottom (pixel art letters)
    ctx.fillStyle = '#FFFFFF';
    // K
    ctx.fillRect(12, 108, 2, 8);
    ctx.fillRect(14, 111, 2, 2);
    ctx.fillRect(16, 108, 2, 3);
    ctx.fillRect(16, 113, 2, 3);
    // I
    ctx.fillRect(20, 108, 2, 8);
    // T
    ctx.fillRect(24, 108, 6, 2);
    ctx.fillRect(26, 110, 2, 6);
    // C
    ctx.fillRect(32, 108, 6, 2);
    ctx.fillRect(32, 114, 6, 2);
    ctx.fillRect(32, 108, 2, 8);
    // H
    ctx.fillRect(40, 108, 2, 8);
    ctx.fillRect(44, 108, 2, 8);
    ctx.fillRect(42, 111, 2, 2);
    // N
    ctx.fillRect(48, 108, 2, 8);
    ctx.fillRect(52, 108, 2, 8);
    ctx.fillRect(50, 110, 2, 4);
  }

  private drawTVFrame(ctx: CanvasRenderingContext2D) {
    // Outer frame (dark)
    ctx.fillStyle = '#212121';
    ctx.fillRect(0, 0, 180, 100);

    // Inner bezel
    ctx.fillStyle = '#424242';
    ctx.fillRect(4, 4, 172, 92);

    // Screen area (dark blue)
    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(8, 8, 164, 80);

    // Stand
    ctx.fillStyle = '#424242';
    ctx.fillRect(70, 92, 40, 8);
    ctx.fillRect(60, 96, 60, 4);

    // Power LED
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(170, 88, 4, 4);
  }

  // FIFA World Cup trophy - gold with globe and two figures
  private drawTrophyWorldCup(ctx: CanvasRenderingContext2D) {
    // Base pedestal
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(9, 44, 18, 6);
    // Cup body - classic chalice shape
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(13, 30, 10, 14);
    // Wider top rim
    ctx.fillRect(10, 26, 16, 6);
    // Two figures holding globe
    ctx.fillRect(8, 10, 4, 18);
    ctx.fillRect(24, 10, 4, 18);
    // Globe on top
    ctx.fillStyle = '#FFB300';
    ctx.beginPath();
    ctx.arc(18, 10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(18, 10, 5, 0, Math.PI * 2);
    ctx.fill();
    // Globe latitude lines
    ctx.strokeStyle = '#FFB300';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(18, 10, 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // UEFA Champions League trophy - silver "Big Ears"
  private drawTrophyChampions(ctx: CanvasRenderingContext2D) {
    // Base
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(10, 44, 20, 6);
    // Stem
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(17, 36, 6, 10);
    // Main cup body - bowl shape
    ctx.fillRect(12, 22, 16, 16);
    // Big ear handles - the iconic feature
    ctx.fillRect(4, 14, 8, 26);
    ctx.fillRect(28, 14, 8, 26);
    // Top rim shiny
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(10, 20, 20, 4);
    // Inner cup dark
    ctx.fillStyle = '#9E9E9E';
    ctx.fillRect(14, 24, 12, 10);
    // Shine highlight
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(6, 18, 2, 8);
    ctx.fillRect(32, 18, 2, 8);
  }

  // Premier League trophy - gold with crown and lion
  private drawTrophyPremier(ctx: CanvasRenderingContext2D) {
    // Purple/blue base
    ctx.fillStyle = '#38003c';
    ctx.fillRect(8, 44, 20, 6);
    // Gold stem
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(15, 34, 6, 12);
    // Main cup body
    ctx.fillRect(10, 20, 16, 16);
    // Handles
    ctx.fillRect(4, 22, 8, 12);
    ctx.fillRect(24, 22, 8, 12);
    // Crown on top - 3 points
    ctx.fillRect(10, 12, 16, 10);
    ctx.fillRect(8, 6, 4, 8);
    ctx.fillRect(16, 4, 4, 10);
    ctx.fillRect(24, 6, 4, 8);
    // Lion emblem hint
    ctx.fillStyle = '#FFB300';
    ctx.fillRect(14, 24, 8, 8);
    // Crown jewels
    ctx.fillStyle = '#E91E63';
    ctx.fillRect(9, 8, 2, 2);
    ctx.fillRect(17, 6, 2, 2);
    ctx.fillRect(25, 8, 2, 2);
  }

  // Photo 1: Red jersey - kicking pose
  private drawPhotoFrame1(ctx: CanvasRenderingContext2D) {
    this.drawPhotoFrameBase(ctx);

    // Footballer kicking ball - RED jersey (Man United style)
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(18, 12, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a3728';
    ctx.fillRect(14, 8, 8, 3);

    // Red jersey
    ctx.fillStyle = '#DA291C';
    ctx.fillRect(14, 16, 8, 10);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(14, 26, 8, 5);

    // Kicking leg extended right
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(22, 28, 8, 3);
    ctx.fillRect(14, 31, 4, 6);

    ctx.fillStyle = '#DA291C';
    ctx.fillRect(14, 35, 4, 3);
    ctx.fillRect(26, 29, 4, 2);

    // Ball
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(32, 30, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(30, 29, 2, 2);
  }

  // Photo 2: Blue jersey - heading pose
  private drawPhotoFrame2(ctx: CanvasRenderingContext2D) {
    this.drawPhotoFrameBase(ctx);

    // Footballer heading ball - BLUE jersey (Chelsea style)
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(20, 14, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2c1810';
    ctx.fillRect(16, 10, 8, 3);

    // Blue jersey
    ctx.fillStyle = '#034694';
    ctx.fillRect(16, 18, 8, 10);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(16, 28, 8, 5);

    // Jumping legs together
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(16, 33, 4, 6);
    ctx.fillRect(20, 33, 4, 6);

    ctx.fillStyle = '#034694';
    ctx.fillRect(16, 37, 4, 3);
    ctx.fillRect(20, 37, 4, 3);

    // Ball above head
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(20, 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(18, 5, 2, 2);
  }

  // Photo 3: Yellow jersey - dribbling pose
  private drawPhotoFrame3(ctx: CanvasRenderingContext2D) {
    this.drawPhotoFrameBase(ctx);

    // Footballer dribbling - YELLOW jersey (Brazil style)
    ctx.fillStyle = '#8d5524';
    ctx.beginPath();
    ctx.arc(16, 14, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(12, 10, 8, 4);

    // Yellow jersey
    ctx.fillStyle = '#FFEB3B';
    ctx.fillRect(12, 18, 8, 10);

    // Blue shorts (Brazil)
    ctx.fillStyle = '#1565C0';
    ctx.fillRect(12, 28, 8, 5);

    // Running legs spread
    ctx.fillStyle = '#8d5524';
    ctx.fillRect(8, 32, 4, 7);
    ctx.fillRect(18, 30, 4, 7);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(8, 37, 4, 3);
    ctx.fillRect(18, 35, 4, 3);

    // Ball at feet
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(26, 38, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(24, 37, 2, 2);
  }

  // Shared photo frame base
  private drawPhotoFrameBase(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 40, 50);
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(3, 3, 34, 44);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(5, 5, 30, 40);
  }

  private drawMenuBoard(ctx: CanvasRenderingContext2D) {
    // Chalkboard
    ctx.fillStyle = '#2E4F2E';
    ctx.fillRect(0, 0, 60, 80);

    // Frame
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(0, 0, 60, 4);
    ctx.fillRect(0, 76, 60, 4);
    ctx.fillRect(0, 0, 4, 80);
    ctx.fillRect(56, 0, 4, 80);

    // Text lines (chalk)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(10, 15, 40, 2);
    ctx.fillRect(10, 25, 35, 2);
    ctx.fillRect(10, 35, 38, 2);
    ctx.fillRect(10, 45, 30, 2);
    ctx.fillRect(10, 55, 42, 2);
    ctx.fillRect(10, 65, 25, 2);
  }

  private drawBeerGlass(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(2, 4, 8, 14);
    ctx.fillStyle = '#FFC107';
    ctx.fillRect(3, 6, 6, 11);
    ctx.fillStyle = '#FFFDE7';
    ctx.fillRect(3, 4, 6, 3);
  }

  private drawBottle(ctx: CanvasRenderingContext2D) {
    // Bottle neck
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(3, 0, 4, 8);
    // Bottle body
    ctx.fillStyle = '#388E3C';
    ctx.fillRect(1, 8, 8, 18);
    // Label
    ctx.fillStyle = '#FFECB3';
    ctx.fillRect(2, 14, 6, 6);
    // Highlight
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(2, 9, 2, 16);
  }

  private drawDeskPhone(ctx: CanvasRenderingContext2D) {
    // Vintage rotary desk phone
    // Base
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(4, 14, 24, 10);

    // Rotary dial area
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(16, 18, 6, 0, Math.PI * 2);
    ctx.fill();

    // Dial holes (gold/brass)
    ctx.fillStyle = '#C9A86C';
    ctx.beginPath();
    ctx.arc(16, 18, 4, 0, Math.PI * 2);
    ctx.fill();

    // Handset cradle
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(2, 10, 28, 6);

    // Handset (the receiver)
    ctx.fillStyle = '#212121';
    // Left ear piece
    ctx.fillRect(0, 2, 8, 10);
    // Handle bar
    ctx.fillRect(6, 4, 20, 4);
    // Right ear piece (mouthpiece)
    ctx.fillRect(24, 2, 8, 10);

    // Highlights
    ctx.fillStyle = '#424242';
    ctx.fillRect(2, 4, 4, 6);
    ctx.fillRect(26, 4, 4, 6);

    // Cord hint
    ctx.fillStyle = '#333333';
    ctx.fillRect(14, 22, 4, 2);
  }

  private drawSpeakerSystem(ctx: CanvasRenderingContext2D) {
    // Sound bar / speaker system below TV

    // Main speaker bar
    ctx.fillStyle = '#212121';
    ctx.fillRect(10, 5, 100, 20);

    // Speaker grille pattern
    ctx.fillStyle = '#333333';
    ctx.fillRect(15, 8, 90, 14);

    // Speaker cones (left, center, right)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(30, 15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(60, 15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(90, 15, 5, 0, Math.PI * 2);
    ctx.fill();

    // Speaker cone centers
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.arc(30, 15, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(60, 15, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(90, 15, 2, 0, Math.PI * 2);
    ctx.fill();

    // LED indicator
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(112, 12, 3, 6);
  }

  private drawCoaster(ctx: CanvasRenderingContext2D) {
    // Cork coaster
    ctx.fillStyle = '#D7CCC8';
    ctx.fillRect(0, 0, 20, 8);
    ctx.fillStyle = '#A1887F';
    ctx.fillRect(2, 2, 16, 4);
    // Ring mark
    ctx.strokeStyle = '#BCAAA4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(10, 4, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  create() {
    // Wait for texture manager to fully process before scene transition
    this.time.delayedCall(100, () => {
      console.log('[PreloadScene] Textures ready, starting BarScene');
      this.scene.start('BarScene');
      this.scene.launch('HUDScene');
    });
  }
}

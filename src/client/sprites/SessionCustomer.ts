// Session customer sprite - represents one CC session as a football fan
// Sits at their own table with a beer tower showing context usage

import Phaser from 'phaser';
import { TEAMS, type TeamKey } from '@shared/teams';

type CustomerState = 'entering' | 'seated' | 'drinking' | 'eating' | 'phoning' | 'walking_to_phone' | 'at_phone' | 'walking_back' | 'leaving';

export class SessionCustomer extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameTag: Phaser.GameObjects.Text;
  private teamBadge: Phaser.GameObjects.Graphics;
  private beerTower: Phaser.GameObjects.Sprite;
  private contextLabel: Phaser.GameObjects.Text;
  private tokensLabel: Phaser.GameObjects.Text;
  private currentState: CustomerState = 'entering';
  private drinkQueue: number = 0;
  private eatQueue: number = 0;
  private beerTowerDetached: boolean = false;

  public sessionId: string;
  public teamKey: TeamKey;
  public tableIndex: number;
  public seatX: number;
  public seatY: number;

  constructor(
    scene: Phaser.Scene,
    sessionId: string,
    teamKey: TeamKey,
    tableIndex: number,
    entranceX: number,
    entranceY: number,
    seatX: number,
    seatY: number
  ) {
    super(scene, entranceX, entranceY);

    this.sessionId = sessionId;
    this.teamKey = teamKey;
    this.tableIndex = tableIndex;
    this.seatX = seatX;
    this.seatY = seatY;

    const team = TEAMS.find(t => t.key === teamKey)!;
    const spriteKey = team.spriteKey;

    // Team-colored sprite
    this.sprite = scene.add.sprite(0, 0, spriteKey);
    this.sprite.setOrigin(0.5, 1);

    // Name tag (short session ID) - same font as context label
    const shortId = sessionId.slice(-6);
    this.nameTag = scene.add.text(0, -58, shortId, {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: team.primary,
      padding: { x: 3, y: 1 }
    });
    this.nameTag.setOrigin(0.5, 0);

    // Team badge - hidden (not used anymore)
    this.teamBadge = scene.add.graphics();

    // Beer tower (context indicator) - placed on table, HIDDEN until waiter delivers
    this.beerTower = scene.add.sprite(30, -10, 'beer-tower');
    this.beerTower.setOrigin(0.5, 1);
    this.beerTower.setScale(0.8);
    this.beerTower.setFrame(0); // Full beer
    this.beerTower.setVisible(false); // Hidden until delivery

    // Context/tokens labels below table - shows "Remaining: X%"
    this.contextLabel = scene.add.text(0, 25, '', {
      fontSize: '10px',
      color: '#4CAF50',
      fontFamily: 'monospace',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 3, y: 1 }
    });
    this.contextLabel.setOrigin(0.5, 0);

    this.tokensLabel = scene.add.text(0, 38, '0', {
      fontSize: '8px',
      color: '#AAAAAA',
      fontFamily: 'monospace',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: { x: 2, y: 1 }
    });
    this.tokensLabel.setOrigin(0.5, 0);

    // Hide labels until beer is delivered
    this.contextLabel.setVisible(false);
    this.tokensLabel.setVisible(false);

    this.add([this.beerTower, this.sprite, this.nameTag, this.teamBadge, this.contextLabel, this.tokensLabel]);
    scene.add.existing(this);

    // Set depth based on Y position for proper layering
    this.setDepth(seatY);

    this.createAnimations();
    this.walkToSeat(seatX, seatY);
  }

  private createAnimations() {
    const key = `fan-${this.teamKey}`;

    if (!this.scene.anims.exists(`${key}-walk`)) {
      this.scene.anims.create({
        key: `${key}-walk`,
        frames: this.scene.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }

    if (!this.scene.anims.exists(`${key}-idle`)) {
      this.scene.anims.create({
        key: `${key}-idle`,
        frames: this.scene.anims.generateFrameNumbers(key, { start: 10, end: 13 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!this.scene.anims.exists(`${key}-drink`)) {
      this.scene.anims.create({
        key: `${key}-drink`,
        frames: this.scene.anims.generateFrameNumbers(key, { start: 4, end: 9 }),
        frameRate: 6,
        repeat: 0
      });
    }

    // Eat animation (frames 14-19)
    if (!this.scene.anims.exists(`${key}-eat`)) {
      this.scene.anims.create({
        key: `${key}-eat`,
        frames: this.scene.anims.generateFrameNumbers(key, { start: 14, end: 19 }),
        frameRate: 5,
        repeat: 0
      });
    }

    // Phone animation (frames 20-23)
    if (!this.scene.anims.exists(`${key}-phone`)) {
      this.scene.anims.create({
        key: `${key}-phone`,
        frames: this.scene.anims.generateFrameNumbers(key, { start: 20, end: 23 }),
        frameRate: 4,
        repeat: -1
      });
    }
  }

  private walkToSeat(seatX: number, seatY: number) {
    this.currentState = 'entering';
    this.sprite.play(`fan-${this.teamKey}-walk`);

    // Flip sprite based on direction
    this.sprite.setFlipX(seatX < this.x);

    this.scene.tweens.add({
      targets: this,
      x: seatX,
      y: seatY,
      duration: 1500,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.currentState = 'seated';
        this.sprite.setFlipX(false);
        this.sprite.play(`fan-${this.teamKey}-idle`);
        this.setDepth(seatY); // Update depth after arriving
      }
    });
  }

  // Trigger drinking animation
  drink() {
    if (this.currentState === 'leaving') return;

    this.drinkQueue++;
    if (this.currentState !== 'drinking') {
      this.playDrink();
    }
  }

  private playDrink() {
    this.currentState = 'drinking';
    this.sprite.play(`fan-${this.teamKey}-drink`);

    this.sprite.once('animationcomplete', () => {
      this.drinkQueue--;
      if (this.drinkQueue > 0) {
        this.sprite.play(`fan-${this.teamKey}-drink`);
      } else {
        this.currentState = 'seated';
        this.sprite.play(`fan-${this.teamKey}-idle`);
      }
    });
  }

  // Trigger eating animation
  eat() {
    if (this.currentState === 'leaving') return;

    this.eatQueue++;
    if (this.currentState !== 'eating') {
      this.playEat();
    }
  }

  private playEat() {
    this.currentState = 'eating';
    this.sprite.play(`fan-${this.teamKey}-eat`);

    this.sprite.once('animationcomplete', () => {
      this.eatQueue--;
      if (this.eatQueue > 0) {
        this.sprite.play(`fan-${this.teamKey}-eat`);
      } else {
        this.currentState = 'seated';
        this.sprite.play(`fan-${this.teamKey}-idle`);
      }
    });
  }

  // Start phone animation
  startPhone() {
    if (this.currentState === 'leaving') return;
    this.currentState = 'phoning';
    this.sprite.play(`fan-${this.teamKey}-phone`);
  }

  // Stop phone and return to idle
  stopPhone() {
    if (this.currentState !== 'phoning') return;
    this.currentState = 'seated';
    this.sprite.play(`fan-${this.teamKey}-idle`);
  }

  // Walk to phone booth for MCP call
  walkToPhoneBooth(boothX: number, boothY: number, onArrive: () => void) {
    // Block if already leaving, walking to phone, or at phone
    if (this.currentState === 'leaving' || this.currentState === 'walking_to_phone' || this.currentState === 'at_phone') return;

    // If walking back from phone, cancel and return to phone booth
    if (this.currentState === 'walking_back') {
      this.scene.tweens.killTweensOf(this);
    }

    this.currentState = 'walking_to_phone';
    this.sprite.play(`fan-${this.teamKey}-walk`);
    this.sprite.setFlipX(boothX < this.x);

    // Detach beer tower - keep it at the table (only if not already detached)
    if (this.beerTower.visible && !this.beerTowerDetached) {
      const worldX = this.seatX + 30; // Use seatX, not current x
      const worldY = this.seatY - 10;
      this.remove(this.beerTower);
      this.beerTower.setPosition(worldX, worldY);
      this.scene.add.existing(this.beerTower);
      this.beerTower.setDepth(this.seatY + 5);

      // Also detach labels
      this.remove(this.contextLabel);
      this.remove(this.tokensLabel);
      this.contextLabel.setPosition(worldX - 30, this.seatY + 25);
      this.tokensLabel.setPosition(worldX - 30, this.seatY + 38);
      this.scene.add.existing(this.contextLabel);
      this.scene.add.existing(this.tokensLabel);

      this.beerTowerDetached = true;
    }

    this.scene.tweens.add({
      targets: this,
      x: boothX + 30, // Stand next to booth
      y: boothY - 20,
      duration: 800,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.currentState = 'at_phone';
        this.sprite.setFlipX(false); // Face forward
        this.sprite.play(`fan-${this.teamKey}-phone`);
        this.setDepth(boothY);
        onArrive();
      }
    });
  }

  // Walk back to seat after MCP call ends
  walkBackToSeat(onArrive?: () => void) {
    if (this.currentState !== 'at_phone') return;

    this.currentState = 'walking_back';
    this.sprite.play(`fan-${this.teamKey}-walk`);
    this.sprite.setFlipX(this.seatX > this.x);

    this.scene.tweens.add({
      targets: this,
      x: this.seatX,
      y: this.seatY,
      duration: 800,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.currentState = 'seated';
        this.sprite.setFlipX(false);
        this.sprite.play(`fan-${this.teamKey}-idle`);
        this.setDepth(this.seatY);
        onArrive?.();
      }
    });
  }

  // Check if customer is available for MCP call (must be seated or doing interruptible activity)
  canMakeCall(): boolean {
    return this.currentState !== 'leaving' &&
           this.currentState !== 'entering' &&
           this.currentState !== 'walking_to_phone' &&
           this.currentState !== 'at_phone' &&
           this.currentState !== 'walking_back';
  }

  // Check if customer is walking back from phone booth
  isWalkingBack(): boolean {
    return this.currentState === 'walking_back';
  }

  // Check if customer is seated at their table
  isSeated(): boolean {
    return this.currentState === 'seated';
  }

  // Show beer tower (called when waiter delivers)
  showBeerTower() {
    this.beerTower.setVisible(true);
    this.contextLabel.setVisible(true);
    this.tokensLabel.setVisible(true);
  }

  // Update beer tower level (contextPercent = used, display remaining)
  updateBeerLevel(contextPercent: number, tokens: number = 0, triggerDrink: boolean = false) {
    // Beer level = remaining context (100 - used)
    const remaining = 100 - contextPercent;

    // Trigger drink animation if context increased (user asked something)
    if (triggerDrink) {
      this.drink();
    }

    // Frame calculation: 0=full(>75%), 1=75%, 2=50%, 3=25%, 4=empty
    let frame = 0;
    if (remaining <= 0) frame = 4;
    else if (remaining <= 25) frame = 3;
    else if (remaining <= 50) frame = 2;
    else if (remaining <= 75) frame = 1;
    else frame = 0;

    // Debug: uncomment to trace beer tower updates
    // console.log(`[BeerTower] ${this.sessionId}: used=${contextPercent}%, remaining=${remaining}%, frame=${frame}`);
    this.beerTower.setFrame(frame);

    // Update context label - show "Remaining: X%" with color coding
    this.contextLabel.setText(`Remaining: ${remaining}%`);
    if (remaining > 50) {
      this.contextLabel.setColor('#4CAF50'); // Green - plenty left
    } else if (remaining > 25) {
      this.contextLabel.setColor('#FFC107'); // Yellow - warning
    } else {
      this.contextLabel.setColor('#F44336'); // Red - low
    }

    // Update tokens label
    this.tokensLabel.setText(this.formatTokens(tokens));

    // Warning pulse when low
    if (remaining <= 25 && remaining > 0) {
      this.scene.tweens.add({
        targets: this.beerTower,
        alpha: 0.5,
        duration: 300,
        yoyo: true,
        repeat: 1
      });
    }
  }

  private formatTokens(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  // Leave animation - detach beer tower for waiter pickup
  leave(exitX: number, exitY: number, onComplete: (beerTower: Phaser.GameObjects.Sprite | null, tableX: number, tableY: number) => void) {
    if (this.currentState === 'leaving') return;

    this.currentState = 'leaving';
    this.sprite.play(`fan-${this.teamKey}-walk`);
    this.sprite.setFlipX(exitX > this.x);

    // Detach beer tower from container and reparent to scene (if visible)
    let orphanBeerTower: Phaser.GameObjects.Sprite | null = null;
    if (this.beerTower.visible) {
      // Calculate world position (container pos + local offset)
      const worldX = this.x + 30; // beer tower local offset X
      const worldY = this.y - 10; // beer tower local offset Y

      // Remove from container
      this.remove(this.beerTower);

      // Reparent to scene at world position
      this.beerTower.setPosition(worldX, worldY);
      this.scene.add.existing(this.beerTower);
      this.beerTower.setDepth(this.seatY + 10);

      orphanBeerTower = this.beerTower;
    }

    // Hide context labels
    this.contextLabel.setVisible(false);
    this.tokensLabel.setVisible(false);

    this.scene.tweens.add({
      targets: this,
      x: exitX,
      y: exitY,
      duration: 1200,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.destroy();
        onComplete(orphanBeerTower, this.seatX, this.seatY);
      }
    });
  }

  getTeam() {
    return TEAMS.find(t => t.key === this.teamKey);
  }
}

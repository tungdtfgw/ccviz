// Sub-agent sprite - represents a task agent spawned by CC session
// Uses parent session's team color

import Phaser from 'phaser';
import { TEAMS, type TeamKey } from '@shared/teams';

type SubAgentState = 'walking' | 'sitting' | 'idle' | 'eating' | 'phoning' | 'leaving';

export class SubAgent extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameTag: Phaser.GameObjects.Text;
  private currentState: SubAgentState = 'walking';

  public agentId: string;
  public agentType: string;
  public teamKey?: TeamKey;

  private targetX: number;
  private targetY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    agentId: string,
    agentType: string,
    targetX: number,
    targetY: number,
    teamKey?: TeamKey
  ) {
    super(scene, x, y);

    this.agentId = agentId;
    this.agentType = agentType;
    this.teamKey = teamKey;
    this.targetX = targetX;
    this.targetY = targetY;

    // Use team sprite if provided, otherwise generic customer
    const spriteKey = teamKey ? `fan-${teamKey}` : 'customer';
    this.sprite = scene.add.sprite(0, 0, spriteKey);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(0.85); // Slightly smaller than main customers

    // Get team colors for name tag
    const team = teamKey ? TEAMS.find(t => t.key === teamKey) : null;
    const bgColor = team?.primary || '#9c27b0';

    // Truncate long agent type names
    const displayName = agentType.length > 12 ? agentType.slice(0, 10) + '..' : agentType;
    this.nameTag = scene.add.text(0, -50, displayName, {
      fontSize: '7px',
      color: '#ffffff',
      backgroundColor: bgColor,
      padding: { x: 2, y: 1 }
    });
    this.nameTag.setOrigin(0.5, 0);

    this.add([this.sprite, this.nameTag]);
    scene.add.existing(this);

    // Set depth based on Y for proper layering
    this.setDepth(targetY + 1);

    this.createAnimations();
    this.walkToSpot();
  }

  private createAnimations() {
    const scene = this.scene;
    const key = this.teamKey ? `fan-${this.teamKey}` : 'customer';

    if (!scene.anims.exists(`${key}-walk`)) {
      scene.anims.create({
        key: `${key}-walk`,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }

    if (!scene.anims.exists(`${key}-idle`)) {
      // Use thinking frames for idle (frames 10-13) if team sprite
      const idleStart = this.teamKey ? 10 : 6;
      const idleEnd = this.teamKey ? 13 : 9;
      scene.anims.create({
        key: `${key}-idle`,
        frames: scene.anims.generateFrameNumbers(key, { start: idleStart, end: idleEnd }),
        frameRate: 4,
        repeat: -1
      });
    }

    // Eat animation (frames 14-19) - only for team sprites
    if (this.teamKey && !scene.anims.exists(`${key}-eat`)) {
      scene.anims.create({
        key: `${key}-eat`,
        frames: scene.anims.generateFrameNumbers(key, { start: 14, end: 19 }),
        frameRate: 5,
        repeat: 0
      });
    }

    // Phone animation (frames 20-23) - only for team sprites
    if (this.teamKey && !scene.anims.exists(`${key}-phone`)) {
      scene.anims.create({
        key: `${key}-phone`,
        frames: scene.anims.generateFrameNumbers(key, { start: 20, end: 23 }),
        frameRate: 4,
        repeat: -1
      });
    }
  }

  private walkToSpot() {
    this.currentState = 'walking';
    const key = this.teamKey ? `fan-${this.teamKey}` : 'customer';
    this.sprite.play(`${key}-walk`);

    // Flip based on direction
    this.sprite.setFlipX(this.targetX < this.x);

    this.scene.tweens.add({
      targets: this,
      x: this.targetX,
      y: this.targetY,
      duration: 1200,
      ease: 'Power1',
      onComplete: () => {
        this.sitDown();
      }
    });
  }

  private sitDown() {
    this.currentState = 'sitting';
    const key = this.teamKey ? `fan-${this.teamKey}` : 'customer';
    this.sprite.setFlipX(false);
    this.sprite.play(`${key}-idle`);

    // Small bounce when sitting
    this.scene.tweens.add({
      targets: this,
      y: this.y - 4,
      duration: 80,
      yoyo: true
    });

    this.setDepth(this.y);
  }

  leave(exitX: number, exitY: number, onComplete?: () => void) {
    if (this.currentState === 'leaving') return;

    this.currentState = 'leaving';
    const key = this.teamKey ? `fan-${this.teamKey}` : 'customer';
    this.sprite.play(`${key}-walk`);
    this.sprite.setFlipX(exitX > this.x);

    this.scene.tweens.add({
      targets: this,
      x: exitX,
      y: exitY,
      duration: 1000,
      ease: 'Power1',
      onComplete: () => {
        this.destroy();
        onComplete?.();
      }
    });
  }
}

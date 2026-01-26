// Chef NPC - exits kitchen with food when MCP tool is called
// Delivers random food to customer table, returns to kitchen

import Phaser from 'phaser';
import EventEmitter from 'eventemitter3';

type ChefState = 'idle' | 'walking' | 'carrying';

interface FoodDelivery {
  tableX: number;
  tableY: number;
  sessionId: string;
  mcpServer: string;
  onDelivered?: () => void;
}

interface ChefEvents {
  'food:delivered': [sessionId: string, foodType: string];
}

export class Chef extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameTag: Phaser.GameObjects.Text;
  private carryFoodSprite?: Phaser.GameObjects.Sprite;
  private currentState: ChefState = 'idle';
  private kitchenPosition: { x: number; y: number };
  private deliveryQueue: FoodDelivery[] = [];
  private isProcessing = false;
  private events: EventEmitter<ChefEvents> = new EventEmitter();

  // Food types for random selection
  private foodTypes = ['pizza', 'burger', 'steak', 'sushi', 'sandwich', 'salad', 'cake'];

  constructor(
    scene: Phaser.Scene,
    kitchenX: number,
    kitchenY: number
  ) {
    super(scene, kitchenX, kitchenY);

    this.kitchenPosition = { x: kitchenX, y: kitchenY };

    // Use waiter sprite as base (same uniform style)
    this.sprite = scene.add.sprite(0, 0, 'waiter');
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setTint(0xFFFFFF); // White tint for chef

    // Name tag "chef"
    this.nameTag = scene.add.text(0, -50, 'chef', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#FFFFFF', // White chef hat color
      padding: { x: 3, y: 1 }
    });
    this.nameTag.setOrigin(0.5, 1);
    this.nameTag.setStyle({ color: '#333333' }); // Dark text on white bg

    this.add([this.sprite, this.nameTag]);
    scene.add.existing(this);

    // Start hidden (in kitchen)
    this.setVisible(false);
    this.setDepth(kitchenY);

    this.createAnimations();
  }

  private createAnimations() {
    const scene = this.scene;

    // Reuse waiter animations for chef
    if (!scene.anims.exists('chef-idle')) {
      scene.anims.create({
        key: 'chef-idle',
        frames: scene.anims.generateFrameNumbers('waiter', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!scene.anims.exists('chef-walk')) {
      scene.anims.create({
        key: 'chef-walk',
        frames: scene.anims.generateFrameNumbers('waiter', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }

    if (!scene.anims.exists('chef-carry')) {
      scene.anims.create({
        key: 'chef-carry',
        frames: scene.anims.generateFrameNumbers('waiter', { start: 4, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    }
  }

  private playIdle() {
    this.currentState = 'idle';
    this.sprite.play('chef-idle');
  }

  private playWalk() {
    this.currentState = 'walking';
    this.sprite.play('chef-walk');
  }

  private playCarry() {
    this.currentState = 'carrying';
    this.sprite.play('chef-carry');
  }

  // Queue food delivery to a table (called when MCP starts)
  queueFoodDelivery(tableX: number, tableY: number, sessionId: string, mcpServer: string, onDelivered?: () => void) {
    this.deliveryQueue.push({ tableX, tableY, sessionId, mcpServer, onDelivered });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.deliveryQueue.length === 0) return;

    this.isProcessing = true;
    const delivery = this.deliveryQueue.shift()!;

    // Random food type
    const foodType = this.foodTypes[Math.floor(Math.random() * this.foodTypes.length)];

    // 1. Appear from kitchen with food
    this.setPosition(this.kitchenPosition.x, this.kitchenPosition.y);
    this.setVisible(true);
    this.spawnCarryFood(foodType);
    this.playCarry();

    // Small delay before walking
    await this.delay(300);

    // 2. Walk to customer's table
    await this.walkTo(delivery.tableX + 30, delivery.tableY);

    // 3. Place food (remove carry sprite)
    this.removeCarryFood();

    // Emit food delivered event
    this.events.emit('food:delivered', delivery.sessionId, foodType);
    delivery.onDelivered?.();

    // Small delay for placement
    await this.delay(200);

    // 4. Walk back to kitchen
    await this.walkTo(this.kitchenPosition.x, this.kitchenPosition.y);

    // Hide chef
    this.setVisible(false);

    this.isProcessing = false;

    // Process next in queue
    this.processQueue();
  }

  private walkTo(targetX: number, targetY: number): Promise<void> {
    return new Promise(resolve => {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const duration = Math.max(400, distance * 2.5); // Faster than waiter

      // Flip based on direction
      this.sprite.setFlipX(targetX < this.x);

      this.scene.tweens.add({
        targets: this,
        x: targetX,
        y: targetY,
        duration,
        ease: 'Linear',
        onUpdate: () => {
          this.setDepth(this.y);
        },
        onComplete: () => {
          this.sprite.setFlipX(false);
          resolve();
        }
      });
    });
  }

  private spawnCarryFood(foodType: string) {
    // Map food type to frame index
    const foodFrames: Record<string, number> = {
      beer: 0, pizza: 1, burger: 2, coffee: 3,
      sandwich: 4, sushi: 5, steak: 6, salad: 7, cake: 8, wine: 9
    };
    const frame = foodFrames[foodType] ?? 2; // Default: burger

    this.carryFoodSprite = this.scene.add.sprite(0, -20, 'food');
    this.carryFoodSprite.setOrigin(0.5, 1);
    this.carryFoodSprite.setScale(1.8);
    this.carryFoodSprite.setFrame(frame);
    this.add(this.carryFoodSprite);
  }

  private removeCarryFood() {
    if (this.carryFoodSprite) {
      this.remove(this.carryFoodSprite);
      this.carryFoodSprite.destroy();
      this.carryFoodSprite = undefined;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.time.delayedCall(ms, resolve);
    });
  }

  // Event handling for delivery callbacks
  onDelivery<K extends keyof ChefEvents>(
    event: K,
    callback: (...args: ChefEvents[K]) => void
  ) {
    this.events.on(event, callback as (...args: ChefEvents[K]) => void);
  }

  isDelivering(): boolean {
    return this.isProcessing;
  }

  getQueueLength(): number {
    return this.deliveryQueue.length;
  }
}

// Waiter NPC - walks between counter/kitchen and tables to deliver beer/food
// Has name tag "claude-kit" and can speak via speech bubble

import Phaser from 'phaser';
import EventEmitter from 'eventemitter3';
import { SpeechBubble } from './SpeechBubble';
import { getContrastingTextColor } from '../utils/color-contrast';

type WaiterState = 'idle' | 'walking' | 'carrying';

interface DeliveryTarget {
  tableX: number;
  tableY: number;
  sessionId: string;
  contextPercent: number;
}

interface FoodDeliveryTarget {
  tableX: number;
  tableY: number;
  sessionId: string;
  foodType: string;
}

interface PickupTarget {
  tableX: number;
  tableY: number;
  beerTower: Phaser.GameObjects.Sprite;
}

interface WaiterEvents {
  'beer:delivered': [sessionId: string, contextPercent: number];
  'food:delivered': [sessionId: string, foodType: string];
}

export class Waiter extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameTag: Phaser.GameObjects.Text;
  private speechBubble: SpeechBubble;
  private carrySprite?: Phaser.GameObjects.Sprite;
  private carryFoodSprite?: Phaser.GameObjects.Sprite;
  private currentState: WaiterState = 'idle';
  private homePosition: { x: number; y: number };
  private counterPosition: { x: number; y: number };
  private kitchenPosition: { x: number; y: number };
  private deliveryQueue: DeliveryTarget[] = [];
  private foodQueue: FoodDeliveryTarget[] = [];
  private pickupQueue: PickupTarget[] = [];
  private isProcessing = false;
  private events: EventEmitter<WaiterEvents> = new EventEmitter();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    counterX: number,
    counterY: number,
    kitchenX: number = counterX,
    kitchenY: number = counterY
  ) {
    super(scene, x, y);

    this.homePosition = { x, y };
    this.counterPosition = { x: counterX, y: counterY };
    this.kitchenPosition = { x: kitchenX, y: kitchenY };

    this.sprite = scene.add.sprite(0, 0, 'waiter');
    this.sprite.setOrigin(0.5, 1);

    // Name tag "claude-kit"
    const bgColor = '#8B0000'; // Burgundy (matches waiter vest)
    this.nameTag = scene.add.text(0, -50, 'claude-kit', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: getContrastingTextColor(bgColor),
      backgroundColor: bgColor,
      padding: { x: 3, y: 1 }
    });
    this.nameTag.setOrigin(0.5, 1);

    this.add([this.sprite, this.nameTag]);
    scene.add.existing(this);

    this.setDepth(y); // Dynamic depth based on Y

    // Speech bubble above waiter (4s for readable timing, follows waiter)
    this.speechBubble = new SpeechBubble(scene, x, y - 65, { maxWidth: 120, autoAdvanceMs: 4000 });

    this.createAnimations();
    this.playIdle();
  }

  private createAnimations() {
    const scene = this.scene;

    if (!scene.anims.exists('waiter-idle')) {
      scene.anims.create({
        key: 'waiter-idle',
        frames: scene.anims.generateFrameNumbers('waiter', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!scene.anims.exists('waiter-walk')) {
      scene.anims.create({
        key: 'waiter-walk',
        frames: scene.anims.generateFrameNumbers('waiter', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }

    if (!scene.anims.exists('waiter-carry')) {
      scene.anims.create({
        key: 'waiter-carry',
        frames: scene.anims.generateFrameNumbers('waiter', { start: 4, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    }
  }

  private playIdle() {
    this.currentState = 'idle';
    this.sprite.play('waiter-idle');
  }

  private playWalk() {
    this.currentState = 'walking';
    this.sprite.play('waiter-walk');
  }

  private playCarry() {
    this.currentState = 'carrying';
    this.sprite.play('waiter-carry');
  }

  // Queue a beer delivery to a table
  queueDelivery(tableX: number, tableY: number, sessionId: string, contextPercent: number = 0) {
    this.deliveryQueue.push({ tableX, tableY, sessionId, contextPercent });
    this.processQueues();
  }

  // Queue a food delivery to a table (from kitchen)
  queueFoodDelivery(tableX: number, tableY: number, sessionId: string, foodType: string) {
    this.foodQueue.push({ tableX, tableY, sessionId, foodType });
    this.processQueues();
  }

  // Queue a beer tower pickup from table (when customer leaves)
  queuePickup(tableX: number, tableY: number, beerTower: Phaser.GameObjects.Sprite) {
    this.pickupQueue.push({ tableX, tableY, beerTower });
    this.processQueues();
  }

  private async processQueues() {
    if (this.isProcessing) return;

    // Priority: food > beer delivery > pickup
    if (this.foodQueue.length > 0) {
      await this.processFoodDelivery();
    } else if (this.deliveryQueue.length > 0) {
      await this.processBeerDelivery();
    } else if (this.pickupQueue.length > 0) {
      await this.processPickup();
    }
  }

  private async processBeerDelivery() {
    if (this.deliveryQueue.length === 0) return;

    this.isProcessing = true;
    const delivery = this.deliveryQueue.shift()!;

    // 1. Walk to counter
    await this.walkTo(this.counterPosition.x, this.counterPosition.y);

    // 2. Pick up beer (show carry sprite)
    this.spawnCarryBeer(delivery.contextPercent);
    this.playCarry();

    // Small delay for pickup
    await this.delay(300);

    // 3. Walk to customer's table
    await this.walkTo(delivery.tableX + 30, delivery.tableY);

    // 4. Place beer (remove carry sprite)
    this.removeCarryBeer();

    // Emit beer delivered event
    this.events.emit('beer:delivered', delivery.sessionId, delivery.contextPercent);

    // Small delay for placement
    await this.delay(200);

    // 5. Walk back to home position
    await this.walkTo(this.homePosition.x, this.homePosition.y);

    this.playIdle();
    this.isProcessing = false;

    // Process next in queue
    this.processQueues();
  }

  private async processFoodDelivery() {
    if (this.foodQueue.length === 0) return;

    this.isProcessing = true;
    const delivery = this.foodQueue.shift()!;

    // 1. Walk to KITCHEN (not counter)
    await this.walkTo(this.kitchenPosition.x, this.kitchenPosition.y);

    // 2. Pick up food
    this.spawnCarryFood(delivery.foodType);
    this.playCarry();
    await this.delay(400);

    // 3. Walk to customer's table
    await this.walkTo(delivery.tableX + 30, delivery.tableY);

    // 4. Place food
    this.removeCarryFood();
    await this.delay(200);

    // 5. Emit delivery complete event
    this.events.emit('food:delivered', delivery.sessionId, delivery.foodType);

    // 6. Walk back home
    await this.walkTo(this.homePosition.x, this.homePosition.y);

    this.playIdle();
    this.isProcessing = false;

    // Process next
    this.processQueues();
  }

  // Pickup beer tower from vacated table
  private async processPickup() {
    if (this.pickupQueue.length === 0) return;

    this.isProcessing = true;
    const pickup = this.pickupQueue.shift()!;

    // 1. Walk to table
    await this.walkTo(pickup.tableX + 30, pickup.tableY);

    // 2. Pick up beer tower
    const beerFrame = pickup.beerTower.frame.name;
    pickup.beerTower.destroy(); // Remove orphan beer tower from scene
    this.spawnCarryBeerWithFrame(typeof beerFrame === 'number' ? beerFrame : 0);
    this.playCarry();
    await this.delay(300);

    // 3. Walk to counter
    await this.walkTo(this.counterPosition.x, this.counterPosition.y);

    // 4. Put down beer
    this.removeCarryBeer();
    await this.delay(200);

    // 5. Walk back home
    await this.walkTo(this.homePosition.x, this.homePosition.y);

    this.playIdle();
    this.isProcessing = false;

    // Process next
    this.processQueues();
  }

  private walkTo(targetX: number, targetY: number): Promise<void> {
    return new Promise(resolve => {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const duration = Math.max(500, distance * 3); // Speed based on distance

      // Play random footstep sound (Phase 2)
      const footstepKey = `footstep-${Phaser.Math.Between(1, 3)}`;
      const barScene = this.scene as any;
      if (barScene.audioManager) {
        barScene.audioManager.playSFX(footstepKey, 0.3);
      }

      // Flip based on direction
      this.sprite.setFlipX(targetX < this.x);

      if (this.currentState !== 'carrying') {
        this.playWalk();
      }

      this.scene.tweens.add({
        targets: this,
        x: targetX,
        y: targetY,
        duration,
        ease: 'Linear',
        onUpdate: () => {
          // Update depth while walking
          this.setDepth(this.y);
          // Update speech bubble position to follow waiter
          this.speechBubble.setPosition(this.x, this.y - 65);
        },
        onComplete: () => {
          this.sprite.setFlipX(false);
          resolve();
        }
      });
    });
  }

  private spawnCarryBeer(contextPercent: number) {
    // Beer level based on context (inverse)
    const beerPercent = 100 - contextPercent;
    let frame = 0;
    if (beerPercent <= 0) frame = 4;
    else if (beerPercent <= 25) frame = 3;
    else if (beerPercent <= 50) frame = 2;
    else if (beerPercent <= 75) frame = 1;
    else frame = 0;

    this.carrySprite = this.scene.add.sprite(0, -30, 'beer-tower');
    this.carrySprite.setOrigin(0.5, 1);
    this.carrySprite.setScale(0.6);
    this.carrySprite.setFrame(frame);
    this.add(this.carrySprite);
  }

  // Spawn carry beer with specific frame (for pickup)
  private spawnCarryBeerWithFrame(frame: number) {
    this.carrySprite = this.scene.add.sprite(0, -30, 'beer-tower');
    this.carrySprite.setOrigin(0.5, 1);
    this.carrySprite.setScale(0.6);
    this.carrySprite.setFrame(frame);
    this.add(this.carrySprite);
  }

  private removeCarryBeer() {
    if (this.carrySprite) {
      this.remove(this.carrySprite);
      this.carrySprite.destroy();
      this.carrySprite = undefined;
    }
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
    this.carryFoodSprite.setScale(2.5); // Enlarged for better visibility
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
  onDelivery<K extends keyof WaiterEvents>(
    event: K,
    callback: (...args: WaiterEvents[K]) => void
  ) {
    this.events.on(event, callback as (...args: WaiterEvents[K]) => void);
  }

  isDelivering(): boolean {
    return this.isProcessing;
  }

  getQueueLength(): number {
    return this.deliveryQueue.length + this.foodQueue.length;
  }

  /**
   * Speak a message via speech bubble
   * @param message - Text to display
   * @param teamColor - Optional team color
   * @param isAlien - Generate alien Unicode text (Phase 4)
   */
  speak(message: string, teamColor?: string, isAlien = false) {
    // Update bubble position to current waiter position
    this.speechBubble.setPosition(this.x, this.y - 65);
    this.speechBubble.setText(message, teamColor, isAlien);
  }

  destroy() {
    this.speechBubble?.destroy();
    super.destroy();
  }
}

import Phaser from 'phaser';
import { barState } from '../state/BarState';

type AgentState = 'idle' | 'drinking' | 'thinking';

export class MainAgent extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameTag: Phaser.GameObjects.Text;
  private currentState: AgentState = 'idle';
  private drinkQueue: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Character sprite
    this.sprite = scene.add.sprite(0, 0, 'main-agent');
    this.sprite.setOrigin(0.5, 1);

    // Name tag
    this.nameTag = scene.add.text(0, -56, 'Claude', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 4, y: 2 }
    });
    this.nameTag.setOrigin(0.5, 0);

    this.add([this.sprite, this.nameTag]);
    scene.add.existing(this);

    this.createAnimations();
    this.setupStateListeners();
    this.playIdle();
  }

  private createAnimations() {
    const scene = this.scene;

    if (!scene.anims.exists('main-idle')) {
      scene.anims.create({
        key: 'main-idle',
        frames: scene.anims.generateFrameNumbers('main-agent', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1
      });
    }

    if (!scene.anims.exists('main-drink')) {
      scene.anims.create({
        key: 'main-drink',
        frames: scene.anims.generateFrameNumbers('main-agent', { start: 4, end: 9 }),
        frameRate: 8,
        repeat: 0
      });
    }

    if (!scene.anims.exists('main-think')) {
      scene.anims.create({
        key: 'main-think',
        frames: scene.anims.generateFrameNumbers('main-agent', { start: 10, end: 13 }),
        frameRate: 2,
        repeat: -1
      });
    }
  }

  private setupStateListeners() {
    barState.on('context:update', () => {
      this.queueDrink(1);
    });

    barState.on('bar:open', () => {
      this.playIdle();
    });

    barState.on('mcp:start', () => {
      this.think();
    });

    barState.on('mcp:end', () => {
      this.stopThinking();
    });
  }

  private playIdle() {
    this.currentState = 'idle';
    this.sprite.play('main-idle');
  }

  private playDrink() {
    if (this.currentState === 'drinking') return;

    this.currentState = 'drinking';
    this.sprite.play('main-drink');

    this.sprite.once('animationcomplete', () => {
      this.drinkQueue--;
      if (this.drinkQueue > 0) {
        this.sprite.play('main-drink');
      } else {
        this.playIdle();
      }
    });
  }

  private queueDrink(count: number) {
    this.drinkQueue += count;
    if (this.currentState !== 'drinking' && this.currentState !== 'thinking') {
      this.playDrink();
    }
  }

  think() {
    this.currentState = 'thinking';
    this.sprite.play('main-think');
  }

  stopThinking() {
    if (this.drinkQueue > 0) {
      this.playDrink();
    } else {
      this.playIdle();
    }
  }
}

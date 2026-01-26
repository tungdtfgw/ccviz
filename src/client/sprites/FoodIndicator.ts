import Phaser from 'phaser';
import { barState } from '../state/BarState';

// Food frame mapping for skills
const FOOD_FRAMES: Record<string, number> = {
  beer: 0,
  pizza: 1,
  burger: 2,
  coffee: 3,
  sandwich: 4,
  sushi: 5,
  steak: 6,
  salad: 7,
  cake: 8,
  wine: 9
};

export class FoodIndicator extends Phaser.GameObjects.Container {
  private foodSprite: Phaser.GameObjects.Sprite;
  private labelText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Food sprite
    this.foodSprite = scene.add.sprite(0, 0, 'food');
    this.foodSprite.setOrigin(0.5, 0.5);
    this.foodSprite.setScale(2);
    this.foodSprite.setVisible(false);

    // Label
    this.labelText = scene.add.text(0, 20, '', {
      fontSize: '8px',
      color: '#4CAF50',
      fontFamily: 'monospace'
    });
    this.labelText.setOrigin(0.5, 0);
    this.labelText.setVisible(false);

    this.add([this.foodSprite, this.labelText]);
    scene.add.existing(this);

    this.setupStateListeners();
  }

  private setupStateListeners() {
    barState.on('skill:use', (skillName: string) => {
      this.showFood(skillName);
    });
  }

  private showFood(skillName: string) {
    const foodType = this.skillToFood(skillName);
    const frame = FOOD_FRAMES[foodType] ?? 0;

    this.foodSprite.setFrame(frame);
    this.foodSprite.setVisible(true);
    this.labelText.setText(skillName);
    this.labelText.setVisible(true);

    // Reset position
    this.foodSprite.setY(0);
    this.foodSprite.setAlpha(1);

    // Float up animation
    this.scene.tweens.add({
      targets: this.foodSprite,
      y: -30,
      alpha: 0,
      duration: 2000,
      ease: 'Power1',
      onComplete: () => {
        this.foodSprite.setVisible(false);
        this.labelText.setVisible(false);
      }
    });

    // Label fade
    this.scene.tweens.add({
      targets: this.labelText,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      delay: 500
    });
  }

  private skillToFood(skillName: string): string {
    const mapping: Record<string, string> = {
      'code-review': 'pizza',
      'code-reviewer': 'pizza',
      'tester': 'burger',
      'researcher': 'coffee',
      'docs-manager': 'sandwich',
      'debugger': 'steak',
      'planner': 'salad',
      'fullstack-developer': 'sushi',
      'git-manager': 'cake',
      'brainstormer': 'wine'
    };
    return mapping[skillName] || 'beer';
  }
}

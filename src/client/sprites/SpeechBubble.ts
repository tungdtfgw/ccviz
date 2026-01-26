// Speech bubble component for displaying agent dialog
// Shows task description on spawn, result on completion

import Phaser from 'phaser';

interface BubbleConfig {
  maxWidth?: number;
  fontSize?: number;
  autoAdvanceMs?: number;
  teamColor?: string;
}

export class SpeechBubble extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Graphics;
  private textObj: Phaser.GameObjects.Text;
  private skipBtn: Phaser.GameObjects.Text;
  private sentences: string[] = [];
  private currentIndex: number = 0;
  private autoAdvanceTimer?: Phaser.Time.TimerEvent;
  private teamColor: number = 0x000000;
  private config: Required<BubbleConfig>;

  constructor(scene: Phaser.Scene, x: number, y: number, config?: BubbleConfig) {
    super(scene, x, y);

    this.config = {
      maxWidth: config?.maxWidth ?? 150,
      fontSize: config?.fontSize ?? 8,
      autoAdvanceMs: config?.autoAdvanceMs ?? 5000,
      teamColor: config?.teamColor ?? '#000000'
    };

    this.teamColor = Phaser.Display.Color.HexStringToColor(this.config.teamColor).color;

    // Background graphics
    this.background = scene.add.graphics();
    this.add(this.background);

    // Text
    this.textObj = scene.add.text(0, 0, '', {
      fontSize: `${this.config.fontSize}px`,
      fontFamily: 'monospace',
      color: '#000000',
      wordWrap: { width: this.config.maxWidth - 16 },
      align: 'left'
    });
    this.textObj.setOrigin(0.5, 0.5);
    this.add(this.textObj);

    // Skip button
    this.skipBtn = scene.add.text(0, 0, '[x]', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#666666'
    });
    this.skipBtn.setOrigin(1, 0);
    this.skipBtn.setInteractive({ useHandCursor: true });
    this.skipBtn.on('pointerdown', () => this.skip());
    this.add(this.skipBtn);

    scene.add.existing(this);
    this.setVisible(false);
    this.setDepth(1000); // Above all sprites
  }

  setText(text: string, teamColor?: string) {
    if (teamColor) {
      this.teamColor = Phaser.Display.Color.HexStringToColor(teamColor).color;
    }

    // Split into sentences, truncate long ones
    this.sentences = text
      .split(/(?<=\.)\s+/)
      .map(s => s.slice(0, 80))
      .filter(s => s.length > 0);

    if (this.sentences.length === 0) {
      this.sentences = ['...'];
    }

    this.currentIndex = 0;
    this.showCurrentSentence();
  }

  private showCurrentSentence() {
    if (this.currentIndex >= this.sentences.length) {
      this.hide();
      return;
    }

    const sentence = this.sentences[this.currentIndex];
    this.textObj.setText(sentence);

    // Redraw background
    this.drawBubble();

    // Position skip button
    const bounds = this.textObj.getBounds();
    this.skipBtn.setPosition(bounds.width / 2 + 4, -bounds.height / 2 - 4);

    this.setVisible(true);

    // Auto-advance timer
    this.autoAdvanceTimer?.destroy();
    this.autoAdvanceTimer = this.scene.time.delayedCall(
      this.config.autoAdvanceMs,
      () => this.advance()
    );
  }

  private drawBubble() {
    const padding = 8;
    const w = Math.min(this.textObj.width + padding * 2, this.config.maxWidth);
    const h = this.textObj.height + padding * 2;

    this.background.clear();

    // Fill
    this.background.fillStyle(0xffffff, 1);
    this.background.fillRoundedRect(-w / 2, -h / 2, w, h, 8);

    // Border (team color)
    this.background.lineStyle(2, this.teamColor, 1);
    this.background.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    // Tail pointer (pointing down to speaker)
    this.background.fillStyle(0xffffff, 1);
    this.background.fillTriangle(-8, h / 2, 8, h / 2, 0, h / 2 + 12);
    this.background.lineStyle(2, this.teamColor, 1);
    this.background.lineBetween(-8, h / 2, 0, h / 2 + 12);
    this.background.lineBetween(0, h / 2 + 12, 8, h / 2);
  }

  advance() {
    this.currentIndex++;
    this.showCurrentSentence();
  }

  skip() {
    this.autoAdvanceTimer?.destroy();
    this.hide();
    this.emit('skip');
  }

  hide() {
    this.autoAdvanceTimer?.destroy();
    this.setVisible(false);
    this.sentences = [];
    this.currentIndex = 0;
    this.emit('hide');
  }

  isActive(): boolean {
    return this.visible && this.sentences.length > 0;
  }
}

// Object pool for speech bubbles
export class SpeechBubblePool {
  private pool: SpeechBubble[] = [];
  private scene: Phaser.Scene;
  private maxSize: number;

  constructor(scene: Phaser.Scene, maxSize: number = 10) {
    this.scene = scene;
    this.maxSize = maxSize;
  }

  get(x: number, y: number): SpeechBubble | null {
    // Find inactive bubble
    let bubble = this.pool.find(b => !b.isActive());

    if (!bubble && this.pool.length < this.maxSize) {
      bubble = new SpeechBubble(this.scene, x, y);
      this.pool.push(bubble);
    }

    if (bubble) {
      bubble.setPosition(x, y);
      return bubble;
    }

    return null; // Pool exhausted
  }

  release(bubble: SpeechBubble) {
    bubble.hide();
  }
}

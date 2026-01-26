// TV Display component for showing live event feed with CC logo
// Displays throttled events (1 event/2s max) with session team color

import Phaser from 'phaser';
import type { BarEvent } from '@shared/events';
import { TEAMS } from '@shared/teams';

const MAX_VISIBLE_EVENTS = 5;
const EVENT_LINE_HEIGHT = 12;
const THROTTLE_MS = 2000; // 1 event per 2 seconds

export class TVDisplay extends Phaser.GameObjects.Container {
  private screenBg: Phaser.GameObjects.Graphics;
  private eventTexts: Phaser.GameObjects.Text[] = [];
  private eventQueue: { text: string; color: string }[] = [];
  private logo: Phaser.GameObjects.Graphics;
  private liveIndicator: Phaser.GameObjects.Graphics;
  private lastEventTime: number = 0;
  private pendingEvents: BarEvent[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Screen background
    this.screenBg = scene.add.graphics();
    this.screenBg.fillStyle(0x0D1B2A, 1);
    this.screenBg.fillRect(-82, -40, 164, 80);
    this.add(this.screenBg);

    // Live indicator
    this.liveIndicator = scene.add.graphics();
    this.updateLiveIndicator(true);
    this.add(this.liveIndicator);

    // "LIVE" text
    const liveText = scene.add.text(-70, -35, 'LIVE', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#FFFFFF',
      backgroundColor: '#F44336',
      padding: { x: 2, y: 1 }
    });
    this.add(liveText);

    // CC Logo (hand-drawn)
    this.logo = scene.add.graphics();
    this.drawCCLogo();
    this.add(this.logo);

    // Event text lines
    for (let i = 0; i < MAX_VISIBLE_EVENTS; i++) {
      const text = scene.add.text(-75, -20 + i * EVENT_LINE_HEIGHT, '', {
        fontSize: '7px',
        fontFamily: 'monospace',
        color: '#4FC3F7',
        wordWrap: { width: 140 }
      });
      this.eventTexts.push(text);
      this.add(text);
    }

    scene.add.existing(this);
    this.setDepth(100);

    // Start logo animation
    this.animateLogo();

    // Process pending events periodically
    scene.time.addEvent({
      delay: 500,
      callback: this.processPendingEvents,
      callbackScope: this,
      loop: true
    });
  }

  private drawCCLogo() {
    const x = 65;
    const y = -30;

    // Orange "C" letters
    this.logo.lineStyle(2, 0xFF6B00, 1);

    // First C
    this.logo.beginPath();
    this.logo.arc(x - 3, y, 6, 0.5, Math.PI * 2 - 0.5);
    this.logo.strokePath();

    // Second C
    this.logo.beginPath();
    this.logo.arc(x + 3, y, 6, 0.5, Math.PI * 2 - 0.5);
    this.logo.strokePath();
  }

  private updateLiveIndicator(isLive: boolean) {
    this.liveIndicator.clear();
    this.liveIndicator.fillStyle(isLive ? 0xF44336 : 0x757575, 1);
    this.liveIndicator.fillCircle(-78, -32, 3);
  }

  private animateLogo() {
    // Pulse animation for logo
    this.scene.tweens.add({
      targets: this.logo,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  addEvent(event: BarEvent, sessionTeamKey?: string) {
    // Throttle: queue events if too frequent
    this.pendingEvents.push(event);
  }

  private processPendingEvents() {
    const now = Date.now();
    if (this.pendingEvents.length === 0) return;
    if (now - this.lastEventTime < THROTTLE_MS) return;

    const event = this.pendingEvents.shift()!;
    this.lastEventTime = now;

    const formatted = this.formatEvent(event);
    this.eventQueue.unshift(formatted);

    // Keep only recent events
    if (this.eventQueue.length > MAX_VISIBLE_EVENTS) {
      this.eventQueue.pop();
    }

    this.updateDisplay();
    this.flashLive();
  }

  private formatEvent(event: BarEvent): { text: string; color: string } {
    const p = event.payload as Record<string, unknown>;

    // Try to get team color from session
    const teamKey = p.teamKey as string | undefined;
    const team = teamKey ? TEAMS.find(t => t.key === teamKey) : null;
    const color = team?.primary || '#4FC3F7';

    let text: string;
    switch (event.type) {
      case 'session:start':
        text = `▸ Session started`;
        break;
      case 'session:end':
        text = `◂ Session ended`;
        break;
      case 'subagent:start':
        text = `⚡ ${p.agentType}`;
        break;
      case 'subagent:stop':
        text = `✓ ${p.agentType} done`;
        break;
      case 'tool:pre':
        if (p.isMcp) {
          text = `🔧 MCP: ${p.mcpServer}`;
        } else {
          text = `⚙ ${String(p.toolName).slice(0, 12)}`;
        }
        break;
      case 'skill:use':
        text = `🎯 /${p.skillName}`;
        break;
      case 'context:update':
        text = `📊 ${p.percent}%`;
        break;
      default:
        text = `• ${event.type}`;
    }

    return { text, color };
  }

  private updateDisplay() {
    this.eventTexts.forEach((textObj, i) => {
      const event = this.eventQueue[i];
      if (event) {
        textObj.setText(event.text);
        textObj.setColor(event.color);
      } else {
        textObj.setText('');
      }
    });

    // Fade-in animation for new event
    if (this.eventQueue.length > 0) {
      const firstText = this.eventTexts[0];
      firstText.setAlpha(0);
      this.scene.tweens.add({
        targets: firstText,
        alpha: 1,
        duration: 300
      });
    }
  }

  // Blink live indicator when events arrive
  flashLive() {
    this.scene.tweens.add({
      targets: this.liveIndicator,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 2
    });
  }
}

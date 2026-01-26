import Phaser from 'phaser';
import { barState } from '../state/BarState';

export class HUDScene extends Phaser.Scene {
  private sessionsText!: Phaser.GameObjects.Text;
  private agentsText!: Phaser.GameObjects.Text;
  private skillText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private mcpText!: Phaser.GameObjects.Text;

  private sessionStartTime: number = 0;

  constructor() {
    super({ key: 'HUDScene' });
  }

  create() {
    // HUD Panel background (smaller - just sessions + agents)
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.8);
    panel.fillRoundedRect(10, 10, 110, 50, 4);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace'
    };

    // Stats (aggregate view)
    this.sessionsText = this.add.text(20, 18, 'Sessions: 0', textStyle);
    this.agentsText = this.add.text(20, 36, 'Agents: 0', textStyle);

    // Session timer (top right)
    const timerPanel = this.add.graphics();
    timerPanel.fillStyle(0x000000, 0.8);
    timerPanel.fillRoundedRect(690, 10, 100, 28, 4);
    this.timerText = this.add.text(700, 16, '00:00:00', {
      fontSize: '14px',
      color: '#FFC107',
      fontFamily: 'monospace'
    });

    // Skill notification (center top)
    this.skillText = this.add.text(400, 60, '', {
      fontSize: '14px',
      color: '#4CAF50',
      fontFamily: 'monospace',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    });
    this.skillText.setOrigin(0.5, 0.5);
    this.skillText.setVisible(false);

    // MCP indicator (top right below timer)
    this.mcpText = this.add.text(690, 42, '', {
      fontSize: '10px',
      color: '#2196F3',
      fontFamily: 'monospace'
    });

    // Listen for state changes
    barState.on('session:open', () => this.updateSessionCount());
    barState.on('session:close', () => this.updateSessionCount());

    barState.on('agent:enter', () => this.updateAgentCount());
    barState.on('agent:leave', () => this.updateAgentCount());

    barState.on('bar:open', () => {
      this.sessionStartTime = Date.now();
      this.updateSessionCount();
    });

    barState.on('skill:use', (skillName: string) => {
      this.showSkill(skillName);
    });

    barState.on('mcp:start', (server: string) => {
      this.mcpText.setText(`MCP: ${server}`);
    });

    barState.on('mcp:end', () => {
      this.mcpText.setText('');
    });
  }

  private updateSessionCount() {
    const count = barState.getAllSessions().length;
    this.sessionsText.setText(`Sessions: ${count}`);

    // Color code by count
    if (count >= 6) {
      this.sessionsText.setColor('#F44336'); // Red - near capacity
    } else if (count >= 4) {
      this.sessionsText.setColor('#FFC107'); // Yellow
    } else {
      this.sessionsText.setColor('#4CAF50'); // Green
    }
  }

  private updateAgentCount() {
    const count = barState.state.activeAgents.size;
    this.agentsText.setText(`Agents: ${count}`);
  }

  private showSkill(skillName: string) {
    this.skillText.setText(`SKILL: ${skillName}`);
    this.skillText.setVisible(true);

    // Fade out after 2.5 seconds
    this.tweens.add({
      targets: this.skillText,
      alpha: { from: 1, to: 0 },
      duration: 500,
      delay: 2000,
      onComplete: () => {
        this.skillText.setVisible(false);
        this.skillText.setAlpha(1);
      }
    });
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  update() {
    // Update timer
    if (barState.state.isOpen && this.sessionStartTime > 0) {
      const elapsed = Date.now() - this.sessionStartTime;
      this.timerText.setText(this.formatTime(elapsed));
    }
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

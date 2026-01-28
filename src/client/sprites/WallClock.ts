/**
 * WallClock - Animated wall clock that tracks game day/night cycle
 *
 * Features:
 * - 24-hour analog clock face
 * - Hour and minute hands rotate smoothly
 * - Syncs with DayNightController elapsed time
 * - Initializes to current system time
 */

import Phaser from 'phaser';

export class WallClock extends Phaser.GameObjects.Container {
  private clockFace: Phaser.GameObjects.Graphics;
  private hourHand: Phaser.GameObjects.Graphics;
  private minuteHand: Phaser.GameObjects.Graphics;
  private cycleDurationMs: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cycleDurationMs: number
  ) {
    super(scene, x, y);

    this.cycleDurationMs = cycleDurationMs;

    // Create clock face
    this.clockFace = scene.add.graphics();
    this.drawClockFace();
    this.add(this.clockFace);

    // Create hour hand (short, thick)
    this.hourHand = scene.add.graphics();
    this.drawHourHand();
    this.add(this.hourHand);

    // Create minute hand (long, thin)
    this.minuteHand = scene.add.graphics();
    this.drawMinuteHand();
    this.add(this.minuteHand);

    scene.add.existing(this);

    // Don't initialize here - let DayNightController sync via update()
    // Clock will show correct time after first update() call
  }

  /**
   * Draw clock face with circle and 12-hour tick marks
   */
  private drawClockFace(): void {
    const radius = 20;

    // Outer circle (clock frame)
    this.clockFace.lineStyle(2, 0x000000, 1);
    this.clockFace.fillStyle(0xFFFFFF, 1);
    this.clockFace.fillCircle(0, 0, radius);
    this.clockFace.strokeCircle(0, 0, radius);

    // 12 tick marks for hours
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180); // 30° per hour, -90° offset
      const startX = Math.cos(angle) * (radius - 4);
      const startY = Math.sin(angle) * (radius - 4);
      const endX = Math.cos(angle) * (radius - 1);
      const endY = Math.sin(angle) * (radius - 1);

      this.clockFace.lineStyle(1, 0x000000, 1);
      this.clockFace.beginPath();
      this.clockFace.moveTo(startX, startY);
      this.clockFace.lineTo(endX, endY);
      this.clockFace.strokePath();
    }
  }

  /**
   * Draw hour hand (short, thick)
   */
  private drawHourHand(): void {
    this.hourHand.lineStyle(3, 0x000000, 1);
    this.hourHand.beginPath();
    this.hourHand.moveTo(0, 0);
    this.hourHand.lineTo(0, -10); // 10px length
    this.hourHand.strokePath();
  }

  /**
   * Draw minute hand (long, thin)
   */
  private drawMinuteHand(): void {
    this.minuteHand.lineStyle(2, 0x000000, 1);
    this.minuteHand.beginPath();
    this.minuteHand.moveTo(0, 0);
    this.minuteHand.lineTo(0, -16); // 16px length
    this.minuteHand.strokePath();
  }

  /**
   * Update clock hands based on elapsed game time
   * @param elapsed - Elapsed milliseconds in current day/night cycle
   */
  update(elapsed: number): void {
    // Convert elapsed to 24-hour time
    const cycleProgress = elapsed / this.cycleDurationMs; // 0-1 for full cycle
    const totalHours = cycleProgress * 24; // 0-24 hours

    // Hour hand: 360° per 12 hours (30° per hour)
    // Hands are drawn pointing UP (12h), so angle 0 = 12h, angle 90 = 3h
    const hourAngle = ((totalHours % 12) / 12) * 360;

    // Minute hand: 360° per 60 minutes (6° per minute)
    const minutes = (totalHours * 60) % 60;
    const minuteAngle = (minutes / 60) * 360;

    this.hourHand.angle = hourAngle;
    this.minuteHand.angle = minuteAngle;
  }

  /**
   * Initialize clock hands to current system time (unused - kept for reference)
   */
  initializeToSystemTime(): void {
    const now = new Date();
    const hours = now.getHours() % 12; // 0-11
    const minutes = now.getMinutes(); // 0-59

    // Hour hand angle (include minute offset for smooth hour movement)
    const hourAngle = (hours / 12) * 360 + (minutes / 60) * 30;

    // Minute hand angle
    const minuteAngle = (minutes / 60) * 360;

    this.hourHand.angle = hourAngle;
    this.minuteHand.angle = minuteAngle;
  }
}

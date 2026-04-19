import Phaser from "phaser";
import { BaseEnemy } from "../BaseEnemy";

/**
 * Microwave
 * - Chases the player.
 * - When close enough (triggerRadius), stops and starts countdown.
 * - Window glows red gradually, shakes violently, beeps faster.
 * - If not destroyed in time, explodes dealing massive damage and drops no XP.
 * - If killed before explosion, drops large XP amount.
 */
export class Microwave extends BaseEnemy {
  private microwaveState: "CHASE" | "PRIMED" | "EXPLODED" = "CHASE";

  private triggerRadius: number = 120; // Distance to trigger bomb activation
  private blastRadius: number = 160; // Explosion radius (damage ar ea)

  private maxTimer: number = 2000; // 2 second countdown
  private explodeTimer: number = 2000;
  private beepTimer: number = 0; // Counter for beep sounds

  private warningGraphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: any,
    x: number,
    y: number,
    hp: number,
    speed: number,
    damage: number,
  ) {
    super(scene, x, y, hp, speed, damage);

    // Graphics to draw warning circle (beneath character)
    this.warningGraphics = scene.add.graphics();
    this.warningGraphics.setDepth(1);

    // Adjust hitbox for Microwave (Rectangle shape)
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(46, 36);
    body.setOffset(-23, -18);
  }

  update(time: number, delta: number) {
    super.update(time, delta);
    if (!this.active || this.microwaveState === "EXPLODED") return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const player = this.sceneRef.player;
    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      player.x,
      player.y,
    );

    // Microwave flips (left/right) to face player
    this.visual.scaleX = player.x < this.x ? -1 : 1;

    if (this.microwaveState === "CHASE") {
      if (dist <= this.triggerRadius) {
        this.startPrimedSequence();
      } else {
        this.sceneRef.physics.moveToObject(this, player, this.speed);
      }
    } else if (this.microwaveState === "PRIMED") {
      // Stand still during explosion countdown
      body.setVelocity(0, 0);

      // Count down to explosion
      this.explodeTimer -= delta;
      const progress = 1 - Math.max(0, this.explodeTimer / this.maxTimer); // 0 to 1

      // 1. Draw continuously blinking warning circle
      this.drawWarningCircle(time, progress);

      // 2. "Beep" sound logic, accelerating
      this.beepTimer -= delta;
      // Beep speed: From 600ms/beep down to 100ms/beep when about to explode
      const beepInterval = Phaser.Math.Linear(600, 100, progress);

      if (this.beepTimer <= 0) {
        this.spawnBeepText(progress);
        this.beepTimer = beepInterval;
      }

      // 3. EXPLODE
      if (this.explodeTimer <= 0) {
        this.explode();
      }
    }
  }

  private startPrimedSequence() {
    this.microwaveState = "PRIMED";
    this.setVelocity(0, 0);

    // Violent shake effect on enemy image
    this.sceneRef.tweens.add({
      targets: this.visual,
      x: { from: -4, to: 4 },
      y: { from: -2, to: 2 },
      duration: 50, // Very fast
      yoyo: true,
      repeat: -1,
    });
  }

  private drawWarningCircle(time: number, progress: number) {
    this.warningGraphics.clear();
    this.warningGraphics.setPosition(this.x, this.y);

    // Circle expands and contracts slightly with rhythm
    const pulse = 1 + Math.sin(time * 0.01 * (1 + progress * 3)) * 0.05;
    const currentRadius = this.blastRadius * pulse;

    // Red interior zone, semi-transparent
    this.warningGraphics.fillStyle(0xff0000, 0.1 + progress * 0.2);
    this.warningGraphics.fillCircle(0, 0, currentRadius);

    // Red border, increasingly thick and bright
    this.warningGraphics.lineStyle(
      2 + progress * 2,
      0xff0000,
      0.5 + progress * 0.5,
    );
    this.warningGraphics.strokeCircle(0, 0, currentRadius);

    // Add target X mark in center
    this.warningGraphics.lineStyle(1, 0xff0000, 0.3 + progress * 0.4);
    this.warningGraphics.lineBetween(-10, -10, 10, 10);
    this.warningGraphics.lineBetween(-10, 10, 10, -10);
  }

  private spawnBeepText(progress: number) {
    // Text grows and turns red when about to explode
    const size = 12 + Math.floor(progress * 16);
    const isCritical = progress > 0.7;

    const text = this.sceneRef.add
      .text(this.x, this.y - 35, "BEEP!", {
        fontSize: `${size}px`,
        fontFamily: "monospace",
        color: isCritical ? "#ff0000" : "#ffaa00",
        stroke: "#ffffff",
        strokeThickness: 2,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(200);

    // Animate text flying up and fading
    this.sceneRef.tweens.add({
      targets: text,
      y: this.y - 65 - progress * 20, // Flies higher
      alpha: 0,
      scale: 1 + progress,
      duration: Phaser.Math.Linear(600, 250, progress),
      onComplete: () => text.destroy(),
    });
  }

  private explode() {
    this.microwaveState = "EXPLODED";
    if (this.warningGraphics) this.warningGraphics.destroy();
    this.sceneRef.tweens.killTweensOf(this.visual);

    // 1. Check for damage
    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.sceneRef.player.x,
      this.sceneRef.player.y,
    );
    if (dist <= this.blastRadius) {
      this.sceneRef.takePlayerDamage(35); // Large damage amount
    }

    // 2. Explosion visual effects
    const boom = this.sceneRef.add.graphics();
    boom.setPosition(this.x, this.y);
    boom.setDepth(150);

    // Shake camera intensely
    this.sceneRef.cameras.main.shake(400, 0.04);

    // Create bursting explosion that fades
    this.sceneRef.tweens.addCounter({
      from: 0,
      to: this.blastRadius,
      duration: 350,
      onUpdate: (tween) => {
        const r = tween.getValue();
        const p = tween.progress;
        boom.clear();

        // Explosion core (white/yellow)
        boom.fillStyle(0xffffff, 1 - p);
        boom.fillCircle(0, 0, r * 0.4);

        // Outer fire ring (orange/red)
        boom.fillStyle(0xff4400, (1 - p) * 0.8);
        boom.fillCircle(0, 0, r);

        // Shockwave expanding outward
        boom.lineStyle(6 + (1 - p) * 10, 0xff0000, 1 - p);
        boom.strokeCircle(0, 0, r * 1.2);
      },
      onComplete: () => {
        boom.destroy();
        this.destroy(); // Destroy microwave WITHOUT dropping XP
      },
    });

    // Hide and disable physics immediately
    this.setVisible(false);
    if (this.body && "enable" in this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
    }
  }

  // OVERRIDE: Drop large reward (2 XP orbs) if player bravely destroys it before explosion
  protected dropXp() {
    for (let i = 0; i < 2; i++) {
      const rx = this.x + Phaser.Math.Between(-15, 15);
      const ry = this.y + Phaser.Math.Between(-15, 15);
      const orb = this.sceneRef.physics.add.sprite(rx, ry, "screw");
      orb.setData("xp", 1);
      this.sceneRef.orbs.add(orb);
    }
  }

  // OVERRIDE death handler to cleanup variables/effects before destruction
  protected die() {
    if (this.warningGraphics) this.warningGraphics.destroy();
    this.sceneRef.tweens.killTweensOf(this.visual);
    super.die();
  }

  protected drawEnemy() {
    const g = this.visual;
    g.clear();

    const isPrimed = this.microwaveState === "PRIMED";
    const progress = isPrimed
      ? 1 - Math.max(0, this.explodeTimer / this.maxTimer)
      : 0;

    // Draw microwave body (Silver/Gray)
    g.fillStyle(0x94a3b8);
    g.fillRoundedRect(-24, -18, 48, 36, 4);
    g.lineStyle(2, 0x475569);
    g.strokeRoundedRect(-24, -18, 48, 36, 4);

    // Draw window glass
    g.fillStyle(0x0f172a);
    g.fillRoundedRect(-20, -14, 30, 28, 2);

    if (isPrimed) {
      // Oven heating: Glass glows red gradually with progress
      const alpha = 0.3 + progress * 0.7;
      g.fillStyle(0xff0000, alpha);
      g.fillRoundedRect(-20, -14, 30, 28, 2);

      // Heat waves inside (heating effect)
      g.lineStyle(2, 0xffaa00, alpha);
      const waveY = -10 + Math.random() * 20;
      g.lineBetween(-16, waveY, 6, waveY);
    } else {
      // Normal operation (Soft yellow light)
      g.fillStyle(0xfde047, 0.15);
      g.fillRoundedRect(-20, -14, 30, 28, 2);
    }

    // Control panel on right side
    g.fillStyle(0x334155);
    g.fillRect(14, -18, 8, 36);

    // Small LED screen
    g.fillStyle(0x000000);
    g.fillRect(15, -15, 6, 8);

    // LED screen light logic
    if (isPrimed) {
      // Flash red rapidly as explosion warning
      if (
        Math.floor(this.sceneRef.time.now / (100 - progress * 50)) % 2 ===
        0
      ) {
        g.fillStyle(0xff0000);
        g.fillRect(16, -13, 4, 4);
      }
    } else {
      // Green LED (calm)
      g.fillStyle(0x22c55e);
      g.fillRect(16, -13, 4, 4);
    }

    // Physical buttons on control panel
    g.fillStyle(0x94a3b8);
    g.fillCircle(18, -1, 1.5);
    g.fillCircle(18, 5, 1.5);
    g.fillCircle(18, 11, 1.5);
  }
}

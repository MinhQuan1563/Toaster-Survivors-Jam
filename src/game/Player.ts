import Phaser from "phaser";
import { GAME_CONFIG } from "./Constants";

export class Player extends Phaser.GameObjects.Container {
  private graphics: Phaser.GameObjects.Graphics;
  private faceText: Phaser.GameObjects.Text;
  private animFrame: number = 0;
  private isMoving: boolean = false;
  private currentTilt: number = 0;
  private attackTimer: number = 0;
  private isFlipped: boolean = false;

  public hasShield: boolean = false; // Butter Shield state
  public isHyper: boolean = false; // Espresso state

  private faceList: string[] = ["^_^", "O_O", ">_<", "ò_ó"];
  private faceColors: string[] = ["#22c55e", "#3b82f6", "#f59e0b", "#06b6d4"];
  private currentFaceIndex: number = 0;
  private faceTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.graphics = scene.add.graphics();
    this.add(this.graphics);
    this.faceText = scene.add
      .text(0, 0, "^_^", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#22c55e",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    this.add(this.faceText);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(50, 50);
    body.setOffset(-25, -25);
  }

  public setVelocity(x: number, y: number) {
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(x, y);
    }
  }

  public setFlipX(flip: boolean) {
    this.isFlipped = flip;
    this.graphics.scaleX = flip ? -1 : 1;
  }

  public playAttackAnim() {
    this.attackTimer = 15;
    if (this.scene) {
      this.scene.tweens.add({
        targets: this.graphics,
        y: 5,
        scaleY: 0.9,
        yoyo: true,
        duration: 50,
      });
    }
  }

  update(vx: number, vy: number) {
    this.animFrame++;
    this.isMoving = vx !== 0 || vy !== 0;
    if (vx < 0) {
      this.setFlipX(true);
    } else if (vx > 0) {
      this.setFlipX(false);
    }
    const targetTilt = vx * 0.001;
    this.currentTilt = Phaser.Math.Interpolation.Linear(
      [this.currentTilt, targetTilt],
      0.1,
    );
    this.renderCrispE(vx, vy);
  }

  private renderCrispE(vx: number, vy: number) {
    const g = this.graphics;
    g.clear();

    const isIdle = !this.isMoving;
    const walkCycle = isIdle
      ? 0
      : Math.sin(this.animFrame * (this.isHyper ? 0.5 : 0.25)); // Move faster while Hyper
    const bounce = isIdle
      ? Math.sin(this.animFrame * 0.05) * 2
      : Math.abs(walkCycle) * 6;
    const bodyY = -15 - bounce;

    const isAttacking = this.attackTimer > 0;
    if (isAttacking) this.attackTimer--;

    g.setAngle(Phaser.Math.RadToDeg(this.currentTilt));

    // --- DRAW SHIELD (BUTTER SHIELD) ON BACKGROUND & FOREGROUND ---
    if (this.hasShield) {
      g.fillStyle(0xfde047, 0.3); // Soft butter-yellow color
      g.fillCircle(0, bodyY + 5, 45 + Math.sin(this.animFrame * 0.1) * 3);
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeCircle(0, bodyY + 5, 45 + Math.sin(this.animFrame * 0.1) * 3);
    }

    g.fillStyle(GAME_CONFIG.COLORS?.SHADOW || 0x000000, 0.3);
    g.fillEllipse(0, 30, 50 - bounce * 0.5, 12);

    const tailWave = Math.sin(this.animFrame * 0.1) * (isIdle ? 5 : 15);
    g.lineStyle(4, 0x1e293b);
    g.beginPath();
    g.moveTo(-15, bodyY + 15);
    g.strokePath();
    g.fillStyle(0x94a3b8);
    g.fillRect(-45 + tailWave * 0.5, bodyY + 33, 10, 8);
    g.lineStyle(2, 0xcbd5e1);
    g.beginPath();
    g.moveTo(-45 + tailWave * 0.5, bodyY + 35);
    g.lineTo(-49 + tailWave * 0.5, bodyY + 35);
    g.moveTo(-45 + tailWave * 0.5, bodyY + 39);
    g.lineTo(-49 + tailWave * 0.5, bodyY + 39);
    g.strokePath();

    g.fillStyle(0x1e293b);
    g.fillRoundedRect(-25, 15, 50, 16, 8);
    g.fillStyle(0x334155);
    const offset = isIdle
      ? (this.animFrame * 0.5) % 10
      : (this.animFrame * 2) % 10;
    for (let i = 0; i < 6; i++) {
      let lineX = -20 + i * 10 - offset;
      if (lineX > -23 && lineX < 23) {
        g.fillRect(lineX, 15, 3, 16);
      }
    }
    g.fillStyle(0x94a3b8);
    g.fillCircle(-15, 23, 4);
    g.fillCircle(0, 23, 4);
    g.fillCircle(15, 23, 4);

    // While Hyper, the outer shell heats up and turns red
    g.fillStyle(this.isHyper ? 0x991b1b : 0x64748b);
    g.fillRoundedRect(-25, bodyY - 5, 50, 38, 10);
    g.fillStyle(this.isHyper ? 0xef4444 : 0xe2e8f0);
    g.fillRoundedRect(-22, bodyY - 3, 44, 34, 8);
    g.fillStyle(this.isHyper ? 0xfca5a5 : 0x94a3b8);
    g.fillRect(-15, bodyY + 25, 30, 2);
    g.fillRect(-15, bodyY + 28, 30, 2);

    g.fillStyle(0x0f172a);
    g.fillRoundedRect(-15, bodyY - 8, 12, 6, 2);
    g.fillRoundedRect(3, bodyY - 8, 12, 6, 2);

    const heatPulse = isAttacking
      ? 1.5
      : (Math.sin(this.animFrame * 0.1) + 1) / 2;
    const glowColor = isAttacking
      ? 0xffffff
      : this.isHyper
        ? 0xfef08a
        : 0xf97316;
    g.fillStyle(glowColor, Math.min(1, 0.5 + heatPulse * 0.5));
    g.fillRect(-13, bodyY - 7, 8, 3);
    g.fillRect(5, bodyY - 7, 8, 3);

    g.fillStyle(0x0f172a);
    g.fillRect(22, bodyY + 5, 4, 18);
    const leverY = isAttacking
      ? 10
      : this.isMoving
        ? Math.abs(walkCycle) * 4
        : 0;
    g.fillStyle(0xef4444);
    g.fillRoundedRect(20, bodyY + 5 + leverY, 8, 6, 2);

    g.fillStyle(0x020617);
    g.fillRoundedRect(-18, bodyY + 4, 36, 16, 4);
    g.fillStyle(0x1e293b, 0.3);
    g.fillRect(-18, bodyY + 6, 36, 2);
    g.fillRect(-18, bodyY + 10, 36, 2);
    g.fillRect(-18, bodyY + 14, 36, 2);

    this.faceText.y =
      bodyY + 12 + (Math.sin(this.animFrame * 0.1) > 0.5 ? 0.5 : 0);
    this.faceText.x = this.isFlipped ? 2 : -2;

    this.faceTimer++;
    if (this.faceTimer >= (this.isHyper ? 40 : 80)) {
      this.faceTimer = 0;
      this.currentFaceIndex =
        (this.currentFaceIndex + 1) % this.faceList.length;
    }

    const newText =
      isAttacking || this.isHyper
        ? ">_<"
        : this.faceList[this.currentFaceIndex];
    const newColor =
      isAttacking || this.isHyper
        ? this.isHyper
          ? "#facc15"
          : "#ef4444"
        : this.faceColors[this.currentFaceIndex];

    if (this.faceText.text !== newText) {
      this.faceText.setText(newText);
    }
    if (this.faceText.style.color !== newColor) {
      this.faceText.setColor(newColor);
    }
  }
}

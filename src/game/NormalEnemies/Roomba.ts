import Phaser from "phaser";
import { BaseEnemy } from "../BaseEnemy";

/**
 * Roomba: The XP thief.
 * Cyberpunk interface: Glows cyan when patrolling (IDLE), bright red when detecting trash/XP (HUNTING).
 */
export class Roomba extends BaseEnemy {
  private targetOrb: any = null;
  private stolenXp: number = 0; // Stores stolen XP

  update(time: number, delta: number) {
    super.update(time, delta);
    if (!this.active) return;

    // Rotate facing direction of movement
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.lengthSq() > 0) {
      this.visual.rotation = body.velocity.angle() - Math.PI / 2;
    }

    // XP Orbs search logic
    if (!this.targetOrb || !this.targetOrb.active) {
      let near = 400; // Trash detection range
      this.sceneRef.orbs.getChildren().forEach((o: any) => {
        const d = Phaser.Math.Distance.Between(this.x, this.y, o.x, o.y);
        if (d < near) {
          near = d;
          this.targetOrb = o;
        }
      });
    }

    if (this.targetOrb) {
      // Rush towards XP
      this.sceneRef.physics.moveToObject(
        this,
        this.targetOrb,
        this.speed * 1.5,
      );

      // Absorb XP if close enough
      const dist = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        this.targetOrb.x,
        this.targetOrb.y,
      );
      if (dist < 25 && this.targetOrb.active) {
        // Get XP amount and accumulate
        const xpAmount = (this.targetOrb.getData("xp") as number) || 1;
        this.stolenXp += xpAmount;

        this.targetOrb.destroy();
        this.targetOrb = null;

        // Expand when eating
        this.sceneRef.tweens.add({
          targets: this.visual,
          scale: 1.3,
          yoyo: true,
          duration: 150,
        });
      }
    } else {
      // No target, slowly move towards Player
      this.sceneRef.physics.moveToObject(
        this,
        this.sceneRef.player,
        this.speed * 0.5,
      );
    }
  }

  // OVERRIDE XP drop function: Returns all stolen XP + 1
  protected dropXp() {
    const totalXp = this.stolenXp + 1; // Return stolen XP plus its own 1 XP

    const orb = this.sceneRef.physics.add.sprite(this.x, this.y, "screw");
    orb.setData("xp", totalXp);

    // If contains more XP, enlarge orb and change color to yellow/orange for easier identification
    if (totalXp > 1) {
      // Increase size (max scale 3 to avoid oversizing)
      const newScale = 1 + Math.min(totalXp * 0.1, 2);
      orb.setScale(newScale);
      orb.setTint(0xffaa00); // Change to yellow-orange
    }

    this.sceneRef.orbs.add(orb);
  }

  // (die() function already handled in BaseEnemy to call dropXp() and create explosion effects)

  protected drawEnemy() {
    const g = this.visual;
    g.clear();

    const isHunting = this.targetOrb !== null;
    const mainColor = isHunting ? 0xe11d48 : 0x06b6d4; // Red when hunting, cyan when patrolling
    const glowAlpha = isHunting ? 0.4 : 0.2;

    // Rotating brush
    const spinSpeed = isHunting ? 0.4 : 0.15;
    const spinAngle = this.animFrame * spinSpeed;

    g.lineStyle(3, 0xeab308);
    for (let i = 0; i < 3; i++) {
      const angle = spinAngle + (i * Math.PI * 2) / 3;
      g.lineBetween(
        -20,
        -15,
        -20 + Math.cos(angle) * 18,
        -15 + Math.sin(angle) * 18,
      );
    }
    for (let i = 0; i < 3; i++) {
      const angle = -spinAngle + (i * Math.PI * 2) / 3;
      g.lineBetween(
        20,
        -15,
        20 + Math.cos(angle) * 18,
        -15 + Math.sin(angle) * 18,
      );
    }

    // Neon glow
    g.fillStyle(mainColor, glowAlpha);
    g.fillCircle(0, 0, 24);
    g.fillStyle(mainColor, glowAlpha * 0.5);
    g.fillCircle(0, 0, 28);

    // Main body
    g.fillStyle(0x1e293b);
    g.fillCircle(0, 0, 20);
    g.lineStyle(3, 0x334155);
    g.strokeCircle(0, 0, 20);

    // Screen
    g.fillStyle(0x000000);
    g.fillRoundedRect(-12, -8, 24, 14, 4);

    // Blinking eyes
    const isBlinking = this.animFrame % 120 < 6;
    g.fillStyle(mainColor);
    if (isBlinking) {
      g.fillRect(-8, -2, 5, 2);
      g.fillRect(3, -2, 5, 2);
    } else {
      if (isHunting) {
        g.fillRect(-8, -4, 6, 6);
        g.fillRect(2, -4, 6, 6);
      } else {
        g.fillCircle(-6, -1, 2.5);
        g.fillCircle(6, -1, 2.5);
      }
    }

    // Teeth bumper
    g.fillStyle(0x0f172a);
    g.fillRoundedRect(-16, 12, 32, 10, { tl: 0, tr: 0, bl: 5, br: 5 } as any);

    const toothColor = isHunting ? 0xf43f5e : 0x94a3b8;
    g.fillStyle(toothColor);
    for (let i = 0; i < 5; i++) {
      const tx = -12 + i * 6;
      g.fillTriangle(tx, 15, tx + 4, 15, tx + 2, 20);
    }
  }
}

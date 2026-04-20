import Phaser from "phaser";
import { BaseEnemy } from "../BaseEnemy";

/**
 * Roomba: XP thief.
 * Cyberpunk interface: Glows cyan when patrolling (IDLE), bright red when detecting trash/XP (HUNTING).
 * If it steals 5 XP or more, it drops a Buff Item on death!
 */
export class Roomba extends BaseEnemy {
  private targetOrb: any = null;
  private stolenXp: number = 0; // Stores stolen XP
  private searchTimer: number = 0;

  update(time: number, delta: number) {
    super.update(time, delta);
    if (!this.active) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.lengthSq() > 0) {
      this.visual.rotation = body.velocity.angle() - Math.PI / 2;
    }

    this.searchTimer += delta;

    // [OPTIMIZATION] Throttle search: Only search for an orb every 300ms, NOT every frame!
    if ((!this.targetOrb || !this.targetOrb.active) && this.searchTimer > 300) {
      this.searchTimer = 0; // Reset timer
      let nearSq = 160000; // 400 * 400 (Squared distance for performance)
      
      this.sceneRef.orbs.getChildren().forEach((o: any) => {
        if (!o.active) return;
        const dSq = Phaser.Math.Distance.Squared(this.x, this.y, o.x, o.y);
        if (dSq < nearSq) {
          nearSq = dSq;
          this.targetOrb = o;
        }
      });
    }

    if (this.targetOrb && this.targetOrb.active) {
      this.sceneRef.physics.moveToObject(
        this,
        this.targetOrb,
        this.speed * 1.5,
      );
      const distSq = Phaser.Math.Distance.Squared(this.x, this.y, this.targetOrb.x, this.targetOrb.y);
      if (distSq < 625) {
        const xpAmount = (this.targetOrb.getData("xp") as number) || 1;
        this.stolenXp += xpAmount;

        this.targetOrb.destroy();
        this.targetOrb = null;

        this.sceneRef.tweens.add({
          targets: this.visual,
          scale: 1.3,
          yoyo: true,
          duration: 150,
        });
      }
    } else {
      this.sceneRef.physics.moveToObject(
        this,
        this.sceneRef.player,
        this.speed * 0.5,
      );
    }
  }

  protected dropXp() {
    if (this.stolenXp >= 5) {
      // If stolen XP is 5 or more, drop a Buff Item instead of XP Orbs
      if (typeof this.sceneRef.spawnBuffItem === "function") {
        this.sceneRef.spawnBuffItem(this.x, this.y);
      }
    } else {
      // Otherwise, drop XP Orbs as normal
      this.sceneRef.spawnXpOrb(this.x, this.y);
    }
  }

  protected drawEnemy() {
    const g = this.visual;
    g.clear();

    const isHunting = this.targetOrb !== null;
    const mainColor = isHunting ? 0xe11d48 : 0x06b6d4;
    const glowAlpha = isHunting ? 0.4 : 0.2;

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

    g.fillStyle(mainColor, glowAlpha);
    g.fillCircle(0, 0, 24);
    g.fillStyle(mainColor, glowAlpha * 0.5);
    g.fillCircle(0, 0, 28);
    g.fillStyle(0x1e293b);
    g.fillCircle(0, 0, 20);
    g.lineStyle(3, 0x334155);
    g.strokeCircle(0, 0, 20);
    g.fillStyle(0x000000);
    g.fillRoundedRect(-12, -8, 24, 14, 4);

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

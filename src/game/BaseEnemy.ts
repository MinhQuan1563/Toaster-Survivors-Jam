import Phaser from "phaser";
import GameScene from "./GameScene";

/**
 * Base class for all enemies (no health bar above head)
 */
export class BaseEnemy extends Phaser.GameObjects.Container {
  public hp: number;
  public maxHp: number;
  public damage: number;
  public speed: number;
  public isBoss: boolean = false;

  protected sceneRef: GameScene;
  protected visual: Phaser.GameObjects.Graphics;
  protected animFrame: number = 0;

  constructor(
    scene: GameScene,
    x: number,
    y: number,
    hp: number,
    speed: number,
    damage: number,
  ) {
    super(scene, x, y);
    this.sceneRef = scene;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.damage = damage;

    // Create visual display layer
    this.visual = scene.add.graphics();
    this.add(this.visual);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set default hitbox
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(40, 40);
    body.setOffset(-20, -20);
  }

  public setVelocity(x: number, y: number) {
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(x, y);
    }
    return this;
  }

  public takeDamage(amount: number) {
    this.hp -= amount;

    // Hit effect
    this.sceneRef.playSoundEffect("hit", 0.3);
    this.sceneRef.createSparkVFX(this.x, this.y);

    // Light knockback effect
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      this.y -= 2; // Small upward bounce
    }

    // Visual flash effect
    this.visual.setAlpha(0.3);
    this.sceneRef.time.delayedCall(80, () => {
      if (this.active) this.visual.setAlpha(1);
    });

    if (this.hp <= 0) this.die();
  }

  // Drop XP
  protected dropXp() {
    this.sceneRef.spawnXpOrb(this.x, this.y);
  }

  protected die() {
    this.dropXp();

    // Death / explosion effect (applies to all enemies)
    this.sceneRef.playSoundEffect("explode", 0.2); // Explosion sound

    // Create an explosion effect based on whether the enemy is a normal enemy or a boss
    const explosionScale = this.isBoss ? 3 : 1;
    this.sceneRef.createExplosionVFX(this.x, this.y, explosionScale);

    if (this.isBoss) {
      this.sceneRef.cameras.main.shake(300, 0.02); // Strong screen shake when a boss dies
    }

    // Explosion effect / disappear on death
    this.sceneRef.tweens.add({
      targets: this.visual,
      scale: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => this.destroy(),
    });
  }

  update(_time: number, _delta: number) {
    this.animFrame++;
    this.drawEnemy();
  }

  // Default visual for basic enemy
  protected drawEnemy() {
    const g = this.visual;
    g.clear();
    const bob = Math.sin(this.animFrame * 0.1) * 3;

    g.fillStyle(0x64748b);
    g.fillRoundedRect(-15, -15 - bob, 30, 30, 5);
    g.lineStyle(2, 0x000000);
    g.strokeRoundedRect(-15, -15 - bob, 30, 30, 5);
  }
}

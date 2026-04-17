import Phaser from "phaser";
import GameScene from "./GameScene";

/**
 * Base class for all enemies (No health bar above head)
 */
export class BaseEnemy extends Phaser.GameObjects.Container {
  public hp: number;
  public maxHp: number;
  public damage: number;
  public speed: number;
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

    // Blinking effect when hit
    this.visual.setAlpha(0.3);

    this.sceneRef.time.delayedCall(80, () => {
      if (this.active) this.visual.setAlpha(1);
    });

    if (this.hp <= 0) this.die();
  }

  // Drop XP function
  protected dropXp() {
    this.sceneRef.spawnXpOrb(this.x, this.y);
  }

  protected die() {
    this.dropXp();

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

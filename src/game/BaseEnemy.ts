import Phaser from "phaser";
import GameScene from "./GameScene";

/**
 * Base class for all enemies
 */
export class BaseEnemy extends Phaser.GameObjects.Container {
  public hp: number;
  public maxHp: number;
  public damage: number;
  public speed: number;
  public isBoss: boolean = false;
  public enemyType: string;
  public isDead: boolean = false;
  public speedModifier: number = 1;

  protected sceneRef: GameScene;
  public visual: Phaser.GameObjects.Graphics;
  protected animFrame: number = 0;

  // Add state management variables for golden carton
  public goldenState: "SURPRISED" | "RUNNING" = "SURPRISED";
  public goldenTimer: number = 0;

  constructor(
    scene: GameScene,
    x: number,
    y: number,
    hp: number,
    speed: number,
    damage: number,
    type: string = "",
  ) {
    super(scene, x, y);
    this.sceneRef = scene;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.damage = damage;
    this.enemyType = type;

    if (type === "CARTON" || type === "GOLDEN_CARTON") {
      const texKey =
        type === "GOLDEN_CARTON" ? "tex_golden_carton" : "tex_carton";
      this.visual = scene.add.sprite(0, 0, texKey) as any;
    } else {
      this.visual = scene.add.graphics() as any;
    }
    this.add(this.visual);

    scene.add.existing(this);
    scene.physics.add.existing(this);

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
    if (this.isDead) return;

    this.hp -= amount;

    this.sceneRef.playSoundEffect("hit", 0.15);
    this.sceneRef.createSparkVFX(this.x, this.y);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) this.y -= 2;

    this.visual.setAlpha(0.3);
    this.sceneRef.time.delayedCall(80, () => {
      if (this.active) this.visual.setAlpha(1);
    });

    if (this.hp <= 0) {
      this.sceneRef.kills++;
      this.die();
    }
  }

  protected dropXp() {
    if (this.enemyType === "GOLDEN_CARTON") {
      this.sceneRef.spawnBuffItem(this.x, this.y);
    } else {
      if (Math.random() < 0.005 * this.sceneRef.luck) {
        this.sceneRef.spawnBuffItem(this.x, this.y);
      } else {
        this.sceneRef.spawnXpOrb(this.x, this.y);
      }
    }
  }

  protected die() {
    if (this.isDead) return;
    this.isDead = true;

    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).checkCollision.none = true;
    }

    this.dropXp();
    this.sceneRef.playSoundEffect("explode", 0.1);

    const explosionScale = this.isBoss ? 3 : 1;
    this.sceneRef.createExplosionVFX(this.x, this.y, explosionScale);

    if (this.isBoss) {
      this.sceneRef.cameras.main.shake(300, 0.02);
      this.sceneRef.currentBoss = null;
    }

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

    if (this.enemyType === "CARTON" || this.enemyType === "GOLDEN_CARTON") {
      const player = this.sceneRef.player;
      const currentSpeed = this.speed * this.speedModifier;
      this.visual.y = Math.sin(this.animFrame * 0.1) * 3;

      if (this.enemyType === "GOLDEN_CARTON") {
        if (this.goldenState === "SURPRISED") {
          this.goldenTimer += _delta;
          this.setVelocity(0, 0); // Stand still
          this.visual.y = Math.sin(this.animFrame * 0.6) * 4; // Shake with fear

          // After 1.5 seconds, switch to running state
          if (this.goldenTimer > 1500) {
            this.goldenState = "RUNNING";
          }
        } else if (this.goldenState === "RUNNING") {
          // Turn around and run away
          const angle = Phaser.Math.Angle.Between(
            player.x,
            player.y,
            this.x,
            this.y,
          );
          // Add some randomness to make it harder to shoot
          const runAngle = angle + Math.sin(this.animFrame * 0.1) * 0.4;
          this.setVelocity(
            Math.cos(runAngle) * currentSpeed,
            Math.sin(runAngle) * currentSpeed,
          );
          this.visual.y = Math.abs(Math.sin(this.animFrame * 0.4) * 12); // Bounce when running

          // Delete if it runs too far (1000px)
          if (
            Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) >
            1000
          ) {
            this.destroy();
          }
        }
      } else {
        // Normal carton: Chase and attack the player
        this.sceneRef.physics.moveToObject(this, player, currentSpeed);
      }
    } else {
      // For complex enemies (Roomba, Microwave), throttle redraws to every 2 frames to save 50% rendering cost
      if (this.animFrame % 2 === 0) {
        this.drawEnemy();
      }
    }

    // this.drawEnemy();
    this.speedModifier = 1;
  }

  protected drawEnemy() {}
}

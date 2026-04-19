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

  protected sceneRef: GameScene;
  protected visual: Phaser.GameObjects.Graphics;
  protected animFrame: number = 0;

  // --- FIX GOLDEN CARTON AI BUG ---
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
    type: string = "CARTON"
  ) {
    super(scene, x, y);
    this.sceneRef = scene;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.damage = damage;
    this.enemyType = type;

    this.visual = scene.add.graphics();
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

    this.sceneRef.playSoundEffect("hit", 0.3);
    this.sceneRef.createSparkVFX(this.x, this.y);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) this.y -= 2;

    this.visual.setAlpha(0.3);
    this.sceneRef.time.delayedCall(80, () => {
      if (this.active) this.visual.setAlpha(1);
    });

    if (this.hp <= 0) this.die();
  }

  protected dropXp() {
    if (this.enemyType === "GOLDEN_CARTON") {
      this.sceneRef.spawnBuffItem(this.x, this.y);
    } else {
      this.sceneRef.spawnXpOrb(this.x, this.y);
    }
  }

  protected die() {
    if (this.isDead) return;
    this.isDead = true;

    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).checkCollision.none = true;
    }

    this.dropXp();
    this.sceneRef.playSoundEffect("explode", 0.2);

    const explosionScale = this.isBoss ? 3 : 1;
    this.sceneRef.createExplosionVFX(this.x, this.y, explosionScale);

    if (this.isBoss) {
      this.sceneRef.cameras.main.shake(300, 0.02);
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

    if (this.constructor.name === "BaseEnemy") {
        const player = this.sceneRef.player;
        
        if (this.enemyType === "GOLDEN_CARTON") {
            // --- FIX AI: Make it startled and stand still for 1.5s so player can react ---
            if (this.goldenState === "SURPRISED") {
                this.goldenTimer += _delta;
                this.setVelocity(0, 0); // Stand still
                this.visual.y = Math.sin(this.animFrame * 0.6) * 4; // Shake with fear

                // After 1.5 seconds, switch to running state
                if (this.goldenTimer > 1500) {
                    this.goldenState = "RUNNING";
                }
            } 
            else if (this.goldenState === "RUNNING") {
                // Turn around and run away
                const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
                // Add some randomness to make it harder to shoot
                const runAngle = angle + Math.sin(this.animFrame * 0.1) * 0.4;
                
                this.setVelocity(Math.cos(runAngle) * this.speed, Math.sin(runAngle) * this.speed);
                this.visual.y = Math.abs(Math.sin(this.animFrame * 0.4) * 12); // Bounce when running
                
                // Delete if it runs too far (1000px)
                if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) > 1000) {
                    this.destroy();
                }
            }
        } else {
            // Normal carton: Chase and attack the player
            this.sceneRef.physics.moveToObject(this, player, this.speed);
        }
    }

    this.drawEnemy();
  }

  protected drawEnemy() {
    const g = this.visual;
    g.clear();
    const bob = Math.sin(this.animFrame * 0.1) * 3;

    if (this.constructor.name !== "BaseEnemy") return;

    const isGolden = this.enemyType === "GOLDEN_CARTON";
    const mainColor = isGolden ? 0xfacc15 : 0xb45309; 
    const darkColor = isGolden ? 0xca8a04 : 0x78350f;
    const tapeColor = isGolden ? 0xffffff : 0xfde047;

    g.fillStyle(mainColor);
    g.fillRoundedRect(-18, -18 - bob, 36, 36, 4);
    g.lineStyle(3, darkColor);
    g.strokeRoundedRect(-18, -18 - bob, 36, 36, 4);

    g.fillStyle(darkColor);
    g.beginPath(); g.moveTo(-18, -18 - bob); g.lineTo(-26, -28 - bob); g.lineTo(0, -18 - bob); g.fillPath(); g.strokePath();
    g.beginPath(); g.moveTo(18, -18 - bob); g.lineTo(26, -28 - bob); g.lineTo(0, -18 - bob); g.fillPath(); g.strokePath();

    g.fillStyle(tapeColor);
    g.fillRect(-5, -18 - bob, 10, 36);

    g.fillStyle(0x000000);
    if (isGolden) {
      g.lineStyle(3, 0x000000);
      g.beginPath(); g.moveTo(-10, -4 - bob); g.lineTo(-4, -10 - bob); g.strokePath();
      g.beginPath(); g.moveTo(10, -4 - bob); g.lineTo(4, -10 - bob); g.strokePath();
      
      if (this.animFrame % 20 < 10) {
          g.fillStyle(0x38bdf8);
          g.fillCircle(14, -12 - bob, 3);
      }

      // --- FIX: Draw a large red exclamation mark when it's panicking ---
      if (this.goldenState === "SURPRISED") {
          g.fillStyle(0xff0000);
          g.fillRoundedRect(-4, -45 - bob, 8, 14, 2);
          g.fillCircle(0, -25 - bob, 4);
      }
      
    } else {
      g.lineStyle(3, 0x000000);
      g.beginPath(); g.moveTo(-10, -10 - bob); g.lineTo(-4, -4 - bob); g.strokePath();
      g.beginPath(); g.moveTo(10, -10 - bob); g.lineTo(4, -4 - bob); g.strokePath();
      g.fillRect(-8, -4 - bob, 4, 4);
      g.fillRect(4, -4 - bob, 4, 4);
    }
  }
}
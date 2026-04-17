import Phaser from "phaser";

/**
 * Burnt toast bullet sprite
 */
export class ToastBullet extends Phaser.Physics.Arcade.Sprite {
  private damage: number;
  private rotationSpeed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, damage: number) {
    // Call 'toast' texture created with Graphics in GameScene.preload
    super(scene, x, y, "toast");

    this.damage = damage;

    // Random rotation speed for each toast slice (creates a chaotic effect)
    // Trigonometry: fast or slow rotation, clockwise or counterclockwise
    this.rotationSpeed =
      Phaser.Math.FloatBetween(0.1, 0.3) * Phaser.Math.RND.sign();

    // Add to scene and physics system
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Adjust hitbox to fit the bullet (original bullet drawn 20x12)
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 10);
  }

  public getDamage(): number {
    return this.damage;
  }

  /**
   * This function can be called in GameScene's update loop if you add a group with runChildUpdate: true
   */
  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);

    // Toast rotation effect while flying
    this.rotation += this.rotationSpeed;
  }
}

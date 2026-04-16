import { BaseEnemy } from "../BaseEnemy";
import GameScene from "../GameScene";

/**
 * Roomba: Steals your XP!
 */
export class Roomba extends BaseEnemy {
    private targetOrb: Phaser.Physics.Arcade.Sprite | null = null;

    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'mouse', 15, 110, 2); // Using mouse texture as placeholder
        this.setTint(0x334155);
    }

    update() {
        if (!this.active) return;

        // Logic: Find nearest XP orb
        if (!this.targetOrb || !this.targetOrb.active) {
            let nearestDist = 300;
            this.sceneRef.orbs.getChildren().forEach((o) => {
                const orb = o as Phaser.Physics.Arcade.Sprite;
                const d = Phaser.Math.Distance.Between(this.x, this.y, orb.x, orb.y);
                if (d < nearestDist) {
                    nearestDist = d;
                    this.targetOrb = orb;
                }
            });
        }

        if (this.targetOrb && this.targetOrb.active) {
            this.sceneRef.physics.moveToObject(this, this.targetOrb, this.speed);
            // If touches orb, eat it
            if (Phaser.Math.Distance.Between(this.x, this.y, this.targetOrb.x, this.targetOrb.y) < 15) {
                this.targetOrb.destroy();
                this.targetOrb = null;
                this.setScale(this.scale + 0.05); // Grows as it eats
            }
        } else {
            // Normal behavior: chase player slowly
            this.sceneRef.physics.moveToObject(this, this.sceneRef.player, this.speed * 0.5);
        }
    }
}
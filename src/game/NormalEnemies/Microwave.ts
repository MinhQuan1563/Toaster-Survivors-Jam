import { BaseEnemy } from "../BaseEnemy";
import GameScene from "../GameScene";

/**
 * Kamikaze Microwave: Beep... Beep... BOOM!
 */
export class Microwave extends BaseEnemy {
    private isCharging = false;
    private warningCircle: Phaser.GameObjects.Graphics;

    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'mouse', 25, 140, 0); 
        this.setTint(0xef4444);
        this.warningCircle = scene.add.graphics();
    }

    update() {
        if (!this.active || this.isCharging) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.sceneRef.player.x, this.sceneRef.player.y);
        
        if (dist < 100) {
            this.startSelfDestruct();
        } else {
            this.sceneRef.physics.moveToObject(this, this.sceneRef.player, this.speed);
        }
    }

    private startSelfDestruct() {
        this.isCharging = true;
        this.setVelocity(0, 0);
        
        // Visual warning
        this.sceneRef.tweens.addCounter({
            from: 0, to: 1, duration: 1500,
            onUpdate: (tween) => {
                const val = tween.getValue();
                this.warningCircle.clear();
                this.warningCircle.lineStyle(2, 0xff0000, 0.5);
                this.warningCircle.strokeCircle(this.x, this.y, 80);
                this.warningCircle.fillStyle(0xff0000, val * 0.3);
                this.warningCircle.fillCircle(this.x, this.y, 80);
                
                // Beeping flash
                if (Math.floor(val * 20) % 2 === 0) this.setTint(0xffffff);
                else this.setTint(0xef4444);
            },
            onComplete: () => {
                this.explode();
            }
        });
    }

    private explode() {
        this.warningCircle.destroy();
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.sceneRef.player.x, this.sceneRef.player.y);
        if (dist < 85) {
            this.sceneRef.takePlayerDamage(40);
        }
        // Explosion particles
        this.destroy();
    }
}
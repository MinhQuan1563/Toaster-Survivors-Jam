import Phaser from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import GameScene from '../GameScene';

/**
 * Boss 1: The Spin Cycle (Washing Machine)
 */
export class WashingMachine extends BaseEnemy {
    private state: 'BOOMERANG' | 'SPIN' = 'BOOMERANG';
    private stateTimer = 0;

    constructor(scene: GameScene, x: number, y: number) {
        super(scene, x, y, 'mouse', 500, 60, 15);
        this.setScale(3);
        this.setTint(0x3b82f6);
    }

    update(time: number, delta: number) {
        if (!this.active) return;
        this.stateTimer += delta;

        if (this.state === 'BOOMERANG') {
            this.sceneRef.physics.moveToObject(this, this.sceneRef.player, this.speed);
            if (this.stateTimer > 4000) {
                this.state = 'SPIN';
                this.stateTimer = 0;
            }
            // Logic to throw socks could go here
        } else {
            // SPIN STATE: Sucking player in
            this.setVelocity(0, 0);
            this.setRotation(this.rotation + 0.2);
            
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.sceneRef.player.x, this.sceneRef.player.y);
            if (dist < 300) {
                const angle = Phaser.Math.Angle.Between(this.sceneRef.player.x, this.sceneRef.player.y, this.x, this.y);
                // Pull player towards boss
                this.sceneRef.player.x += Math.cos(angle) * 2;
                this.sceneRef.player.y += Math.sin(angle) * 2;
            }

            if (this.stateTimer > 3000) {
                this.state = 'BOOMERANG';
                this.stateTimer = 0;
                this.setRotation(0);
            }
        }
    }
}
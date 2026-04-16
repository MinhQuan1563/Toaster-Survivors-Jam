import Phaser from 'phaser';
import { GAME_CONFIG } from './Constants';
import GameScene from './GameScene';

/**
 * Base class for all enemies
 */
export class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
    public hp: number;
    public maxHp: number;
    public damage: number;
    public speed: number;
    protected sceneRef: GameScene;

    constructor(scene: GameScene, x: number, y: number, texture: string, hp: number, speed: number, damage: number) {
        super(scene, x, y, texture);
        this.sceneRef = scene;
        this.hp = hp;
        this.maxHp = hp;
        this.speed = speed;
        this.damage = damage;

        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    takeDamage(amount: number) {
        this.hp -= amount;
        this.setTintFill(0xffffff);
        this.sceneRef.time.delayedCall(80, () => { if (this.active) this.clearTint(); });

        if (this.hp <= 0) {
            this.die();
        }
    }

    protected die() {
        // Drop XP orbs (screws)
        this.sceneRef.spawnXpOrb(this.x, this.y);
        this.destroy();
    }
}
import Phaser from "phaser";
import { BaseEnemy } from "../BaseEnemy";

/**
 * Defective Rice Cooker - TANKER
 * - Very high HP, moves slowly and wobbles.
 * - Confused LED face, prone to electrical sparks (shoots flames).
 * - Ability: Occasionally stops, opens the lid and releases a massive 
 * steam cloud that obscures the player's vision.
 */
export class RiceCooker extends BaseEnemy {
    private stateRiceCooker: 'WALK' | 'STEAMING' = 'WALK';
    
    private steamCooldown: number = 6000; // Releases steam every 6 seconds
    private steamTimer: number = 0;
    
    private steamDuration: number = 1500; // Duration of steam emission (1.5 seconds)
    private steamTick: number = 0;

    private waddleAngle: number = 0; // Wobble angle while walking

    constructor(scene: any, x: number, y: number, hp: number, speed: number, damage: number) {
        // Double HP compared to normal enemies, reduced speed
        super(scene, x, y, hp * 2, speed * 0.6, damage);

        // Rice cooker is large and bulky -> larger hitbox
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(50, 50);
        body.setOffset(-25, -25);
    }

    update(time: number, delta: number) {
        super.update(time, delta);
        if (!this.active) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const player = this.sceneRef.player;

        // Enemy always tries to face the player
        const isFacingLeft = player.x < this.x;
        this.visual.scaleX = isFacingLeft ? -1 : 1;

        if (this.stateRiceCooker === 'WALK') {
            // Wobble effect while walking
            this.waddleAngle = Math.sin(this.animFrame * 0.15) * 0.15;
            this.visual.rotation = this.waddleAngle;

            // Move towards player
            this.sceneRef.physics.moveToObject(this, player, this.speed);

            // Countdown to steam release
            this.steamTimer += delta;
            if (this.steamTimer >= this.steamCooldown) {
                this.startSteaming();
            }
        } 
        else if (this.stateRiceCooker === 'STEAMING') {
            // Stand still and release steam
            body.setVelocity(0, 0);
            
            // Vigorous shaking while steaming
            this.visual.rotation = (Math.random() - 0.5) * 0.2;

            this.steamTick += delta;
            
            // Every 100ms (0.1 seconds), release a large steam puff
            if (this.animFrame % 6 === 0) {
                // Create steam at the top of the rice cooker (lid opening)
                // Add slight randomness for natural dispersion
                const puffX = this.x + Phaser.Math.Between(-30, 30);
                const puffY = this.y - 40 + Phaser.Math.Between(-20, 20);
                
                // Call spawnSteamCloud function from your GameScene
                if (typeof this.sceneRef.spawnSteamCloud === 'function') {
                    this.sceneRef.spawnSteamCloud(puffX, puffY);
                }
            }

            // End steam release
            if (this.steamTick >= this.steamDuration) {
                this.stateRiceCooker = 'WALK';
                this.steamTimer = 0;
                this.steamTick = 0;
                this.visual.rotation = 0; // Return to upright position
            }
        }
    }

    private startSteaming() {
        this.stateRiceCooker = 'STEAMING';
        this.steamTick = 0;

        // Lid pop animation
        this.sceneRef.tweens.add({
            targets: this.visual,
            scaleY: 1.2,
            scaleX: 0.9,
            yoyo: true,
            duration: 150
        });
    }

    // Large rice cooker drops more XP than normal enemies
    protected dropXp() {
        for(let i = 0; i < 2; i++) {
            const rx = this.x + Phaser.Math.Between(-20, 20);
            const ry = this.y + Phaser.Math.Between(-20, 20);
            const orb = this.sceneRef.physics.add.sprite(rx, ry, "screw");
            orb.setData("xp", 1);
            this.sceneRef.orbs.add(orb);
        }
    }

    protected drawEnemy() {
        const g = this.visual;
        g.clear();

        const isSteaming = this.stateRiceCooker === 'STEAMING';
        const bounce = Math.sin(this.animFrame * 0.2) * 2;

        // Basic rice cooker colors (Off-white / Cream)
        const bodyColor = 0xf8fafc;
        const shadowColor = 0xcbd5e1;
        const detailsColor = 0x475569;

        // --- DRAW COOKER BODY ---
        g.fillStyle(bodyColor);
        // Rounded oval-shaped body
        g.fillRoundedRect(-22, -18 - (isSteaming ? 0 : bounce), 44, 38, 12);
        g.lineStyle(3, detailsColor);
        g.strokeRoundedRect(-22, -18 - (isSteaming ? 0 : bounce), 44, 38, 12);

        // Draw stripes at the bottom
        g.fillStyle(shadowColor);
        g.fillRoundedRect(-20, 12 - (isSteaming ? 0 : bounce), 40, 6, 3);

        // --- DRAW LID (OPEN OR CLOSED) ---
        // When steaming, lid flips up
        const lidY = isSteaming ? -35 : -22 - bounce;
        const lidAngle = isSteaming ? -0.3 : 0; // Tilts back when open

        g.save();
        g.translateCanvas(0, lidY);
        g.rotateCanvas(lidAngle);
        
        g.fillStyle(0xe2e8f0);
        g.fillRoundedRect(-20, 0, 40, 12, { tl: 8, tr: 8, bl: 2, br: 2 } as any);
        g.lineStyle(3, detailsColor);
        g.strokeRoundedRect(-20, 0, 40, 12, { tl: 8, tr: 8, bl: 2, br: 2 } as any);
        
        // Handle / Steam vent on the lid
        g.fillStyle(0x94a3b8);
        g.fillRoundedRect(-8, -4, 16, 6, 2);
        
        g.restore();

        // When steaming, draw bulging steam clouds at the lid opening
        if (isSteaming) {
            g.fillStyle(0xffffff, 0.8);
            g.fillCircle(0, -18, 12);
            g.fillCircle(-8, -15, 8);
            g.fillCircle(8, -15, 8);
        }

        // --- DRAW CONFUSED LED FACE ---
        // Rice cooker has an electronic face display
        const faceY = -5 - (isSteaming ? 0 : bounce);
        
        g.fillStyle(0x0f172a); // Black screen
        g.fillRoundedRect(-12, faceY, 24, 12, 3);

        g.fillStyle(0x22c55e); // Green LED
        if (isSteaming) {
            // Distressed face while steaming: X  O  X
            g.lineStyle(2, 0xef4444); // Red to show overload
            g.lineBetween(-8, faceY + 3, -4, faceY + 7);
            g.lineBetween(-4, faceY + 3, -8, faceY + 7);
            
            g.lineBetween(4, faceY + 3, 8, faceY + 7);
            g.lineBetween(8, faceY + 3, 4, faceY + 7);
            
            // O-shaped mouth for steam release
            g.strokeCircle(0, faceY + 8, 2.5);
        } else {
            // Confused face: O  _  O
            g.fillCircle(-6, faceY + 5, 2);
            g.fillCircle(6, faceY + 5, 2);
            g.fillRect(-2, faceY + 7, 4, 2);
        }

        // Rice cooker button
        g.fillStyle(isSteaming ? 0xef4444 : 0x3b82f6); // Red when steaming, Blue normally
        g.fillRoundedRect(-6, faceY + 16, 12, 6, 2);

        // --- ELECTRICAL SPARK EFFECT ---
        // Occasionally sparks for comedic effect (defective unit)
        if (Math.random() < 0.05) {
            g.lineStyle(2, 0xfde047);
            const sx = Phaser.Math.Between(-25, 25);
            const sy = Phaser.Math.Between(-20, 20);
            g.beginPath();
            g.moveTo(sx, sy);
            g.lineTo(sx + 5, sy - 5);
            g.lineTo(sx + 8, sy + 2);
            g.lineTo(sx + 12, sy - 8);
            g.strokePath();
        }
    }
}
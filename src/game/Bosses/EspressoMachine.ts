import Phaser from "phaser";
import { BaseEnemy } from "../BaseEnemy";
import GameScene from "../GameScene";

/**
 * BOSS 2: Ultra-Fast Espresso Machine
 * Skills:
 * - Jitter: Stand still and shake while charging energy.
 * - Dash: High-speed dash across screen, leaving hot coffee trails.
 * - Burst: End dash, shoot 8 coffee beans in all directions.
 */
export class EspressoMachine extends BaseEnemy {
    private stateEspresso: 'JITTER' | 'DASHING' | 'RECOVER' = 'JITTER';
    private stateTimer: number = 0;
    
    // Manage Dash skill
    private dashTargetAngle: number = 0;
    private dashSpeed: number = 900; 
    private lastPuddleTime: number = 0; 

    // Manage Coffee Bean shooting skill
    private beansGroup: Phaser.Physics.Arcade.Group;

    // Animation & Visuals
    private steamParticles: {x: number, y: number, life: number, vx: number, vy: number, scale: number}[] = [];
    private gaugeNeedleAngle: number = 0; 
    
    private hpBarGraphics: Phaser.GameObjects.Graphics;
    private engineGlow: number = 0;

    constructor(scene: GameScene, x: number, y: number, hp: number, speed: number, damage: number) {
        super(scene, x, y, hp, speed, damage);

        this.hpBarGraphics = scene.add.graphics();
        this.add(this.hpBarGraphics);

        this.createBeanTexture(scene);

        this.beansGroup = scene.physics.add.group();
        scene.physics.add.overlap(scene.player, this.beansGroup, (player: any, bean: any) => {
            if (bean.active) {
                scene.takePlayerDamage(10);
                bean.destroy();
            }
        });

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(50, 70);
        body.setOffset(-25, -35);
        body.setMass(800);
    }

    private createBeanTexture(scene: Phaser.Scene) {
        if (!scene.textures.exists('coffee_bean')) {
            const g = scene.make.graphics({x: 0, y: 0});
            g.fillStyle(0x2d1305);
            g.fillEllipse(15, 20, 18, 26);
            g.fillStyle(0x4a2311);
            g.fillEllipse(13, 18, 16, 24);
            g.lineStyle(2, 0x1a0800);
            g.beginPath();
            g.moveTo(13, 9);
            g.lineTo(10, 15);
            g.lineTo(16, 22);
            g.lineTo(13, 29);
            g.strokePath();
            g.generateTexture('coffee_bean', 30, 40);
            g.destroy();
        }
    }

    update(time: number, delta: number) {
        super.update(time, delta);
        if (!this.active) return;

        const body = this.body as Phaser.Physics.Arcade.Body;
        const player = this.sceneRef.player;
        const dt = delta / 1000;

        this.stateTimer += delta;

        // Rotate face except during dash
        if (this.stateEspresso !== 'DASHING') {
            const isFacingLeft = player.x < this.x;
            this.visual.scaleX = Phaser.Math.Linear(this.visual.scaleX, isFacingLeft ? -1 : 1, 0.2);
        }

        // ----------------------------------------
        // STATE MACHINE
        // ----------------------------------------
        if (this.stateEspresso === 'JITTER') {
            body.setVelocity(0, 0);
            
            const intensity = this.stateTimer / 2000; 
            
            this.visual.scaleY = 1 - (Math.sin(time * 0.05) * 0.08 * intensity);
            
            this.visual.x = Phaser.Math.Between(-6 * intensity, 6 * intensity);
            this.visual.y = Phaser.Math.Between(-3 * intensity, 3 * intensity);
            
            this.gaugeNeedleAngle += 0.8 * intensity;
            this.engineGlow = intensity;

            if (Math.random() < 0.3) this.spawnSteam(-10, -45, 0, -2);

            this.dashTargetAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);

            if (this.stateTimer >= 2000) {
                this.switchState('DASHING');
                const leanAngle = 0.5 * Math.sign(Math.cos(this.dashTargetAngle));
                this.sceneRef.tweens.add({ targets: this.visual, rotation: leanAngle, duration: 100 });
            }
        } 
        else if (this.stateEspresso === 'DASHING') {
            body.setVelocity(
                Math.cos(this.dashTargetAngle) * this.dashSpeed,
                Math.sin(this.dashTargetAngle) * this.dashSpeed
            );

            // Leave coffee trail
            if (time > this.lastPuddleTime + 80) { 
                this.sceneRef.spawnCoffeePuddle(this.x, this.y + 25);
                this.lastPuddleTime = time;
                this.spawnSteam(0, 30, -Math.cos(this.dashTargetAngle)*5, -Math.sin(this.dashTargetAngle)*5);
            }

            if (this.stateTimer >= 600) {
                body.setVelocity(0, 0);
                this.sceneRef.tweens.add({ targets: this.visual, rotation: 0, duration: 150 });
                this.burstCoffeeBeans(); 
                this.switchState('RECOVER');
            }
        } 
        else if (this.stateEspresso === 'RECOVER') {
            body.setVelocity(0, 0);
            this.visual.x = 0; 
            this.visual.y = 0;
            this.gaugeNeedleAngle = Phaser.Math.Linear(this.gaugeNeedleAngle, 0, 0.05);
            this.engineGlow = Phaser.Math.Linear(this.engineGlow, 0, 0.05);

            this.visual.scaleY = 1 + Math.sin(time * 0.015) * 0.06;

            if (Math.random() < 0.6) this.spawnSteam(Phaser.Math.Between(-15, 15), -40, 0, Phaser.Math.FloatBetween(-1, -3));

            if (this.stateTimer >= 1800) {
                this.visual.scaleY = 1;
                this.switchState('JITTER');
            }
        }

        this.updateBeans(dt);
        this.updateSteamParticles();
        this.drawLocalHpBar();
    }

    private switchState(newState: 'JITTER' | 'DASHING' | 'RECOVER') {
        this.stateEspresso = newState;
        this.stateTimer = 0;
    }

    private burstCoffeeBeans() {
        for (let i = 0; i < 8; i++) {
            const bean = this.beansGroup.create(this.x, this.y - 10, 'coffee_bean') as Phaser.Physics.Arcade.Sprite;
            const angle = (Math.PI / 4) * i;
            const speed = 400; 
            bean.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bean.setData('rotSpeed', Phaser.Math.FloatBetween(15, 30) * Phaser.Math.RND.sign());
            this.sceneRef.time.delayedCall(2000, () => { if (bean.active) bean.destroy(); });
        }
        this.sceneRef.cameras.main.shake(150, 0.01);
    }

    private updateBeans(dt: number) {
        this.beansGroup.getChildren().forEach((b: any) => {
            const bean = b as Phaser.Physics.Arcade.Sprite;
            if (bean.active) bean.angle += bean.getData('rotSpeed');
        });
    }

    private spawnSteam(ox: number, oy: number, vx: number, vy: number) {
        this.steamParticles.push({
            x: ox, y: oy, life: 1, vx: vx, vy: vy,
            scale: Phaser.Math.FloatBetween(0.5, 1.2)
        });
    }

    private updateSteamParticles() {
        const g = this.visual; 
        for (let i = this.steamParticles.length - 1; i >= 0; i--) {
            let p = this.steamParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            
            if (p.life <= 0) {
                this.steamParticles.splice(i, 1);
            } else {
                g.fillStyle(0xffffff, p.life * 0.6); 
                g.fillCircle(p.x, p.y, (1 - p.life) * 15 * p.scale); 
            }
        }
    }

    private drawLocalHpBar() {
        this.hpBarGraphics.clear();
        if (this.hp <= 0) return;

        const barWidth = 70;
        const barHeight = 8;
        const bx = -barWidth / 2;
        const by = 50; 
        const percent = Math.max(0, this.hp / this.maxHp);

        // Thick black border
        this.hpBarGraphics.fillStyle(0x000000, 0.85);
        this.hpBarGraphics.fillRoundedRect(bx - 3, by - 3, barWidth + 6, barHeight + 6, 4);

        // Health bar BRIGHT RED
        this.hpBarGraphics.fillStyle(0xff1111, 1);
        this.hpBarGraphics.fillRoundedRect(bx, by, barWidth * percent, barHeight, 2);
    }

    protected die() {
        this.beansGroup.clear(true, true); 
        this.hpBarGraphics.clear(); 
        for(let i=0; i<15; i++) {
            const rx = this.x + Phaser.Math.Between(-30, 30);
            const ry = this.y + Phaser.Math.Between(-30, 30);
            const orb = this.sceneRef.physics.add.sprite(rx, ry, "screw");
            orb.setData("xp", 2);
            orb.setTint(0xf59e0b); 
            this.sceneRef.orbs.add(orb);
        }
        super.die();
    }

    // ----------------------------------------
    // NEW SHARP ESPRESSO MACHINE DESIGN
    // ----------------------------------------
    protected drawEnemy() {
        const g = this.visual;
        g.clear();

        const isJitter = this.stateEspresso === 'JITTER';
        const isRecover = this.stateEspresso === 'RECOVER';
        const isDashing = this.stateEspresso === 'DASHING';

        const w = 64;
        const h = 76;

        // Drop shadow on ground
        g.fillStyle(0x000000, 0.2);
        g.fillEllipse(0, h/2 + 5, w, 15);

        // 1. Main machine body (Dark Red & Heavy shading)
        g.fillStyle(0x7f1d1d);
        g.fillRoundedRect(-w/2, -h/2, w, h, 8);
        g.fillStyle(0xdc2626);
        g.fillRoundedRect(-w/2, -h/2, w - 6, h - 4, {tl: 8, tr: 4, bl: 8, br: 4} as any);

        // Cup warming tray (Silver/metallic)
        g.fillStyle(0x94a3b8);
        g.fillRect(-w/2 + 6, -h/2 - 6, w - 12, 6);
        g.lineStyle(2, 0x475569);
        g.beginPath(); g.moveTo(-w/2 + 6, -h/2 - 6); g.lineTo(w/2 - 6, -h/2 - 6); g.strokePath();

        // 2. Water collection tray (Drip tray)
        g.fillStyle(0x334155);
        g.fillRoundedRect(-w/2 - 4, h/2 - 10, w + 8, 14, 4);
        g.fillStyle(0x64748b);
        g.fillRect(-w/2 + 2, h/2 - 10, w - 4, 4);

        // 3. Front metal faceplate (Where spout assembly mounts)
        g.fillStyle(0xf1f5f9);
        g.fillRoundedRect(-22, -20, 44, 48, 6);
        g.lineStyle(2, 0x94a3b8);
        g.strokeRoundedRect(-22, -20, 44, 48, 6);

        // 4. Black LCD screen (Eyes)
        g.fillStyle(0x020617);
        g.fillRoundedRect(-16, -14, 32, 14, 3);
        
        // LED EYES BY STATE
        g.lineStyle(3, 0xff0000);
        
        if (isJitter) {
            const glow = (this.animFrame % 6 < 3) ? 1 : 0.4;
            g.lineStyle(3, 0xff0000, glow);
            g.beginPath(); g.moveTo(-12, -10); g.lineTo(-6, -6); g.lineTo(-12, -2); g.strokePath();
            g.beginPath(); g.moveTo(12, -10); g.lineTo(6, -6); g.lineTo(12, -2); g.strokePath();
        } 
        else if (isDashing) {
            g.lineStyle(3, 0xf97316);
            g.beginPath(); g.moveTo(-12, -8); g.lineTo(-4, -5); g.strokePath();
            g.beginPath(); g.moveTo(12, -8); g.lineTo(4, -5); g.strokePath();
        } 
        else {
            g.lineStyle(2, 0x64748b);
            g.beginPath(); g.moveTo(-10, -9); g.lineTo(-6, -3); g.moveTo(-6, -9); g.lineTo(-10, -3); g.strokePath();
            g.beginPath(); g.moveTo(10, -9); g.lineTo(6, -3); g.moveTo(6, -9); g.lineTo(10, -3); g.strokePath();
        }

        // 5. Espresso group head & Portafilter assembly
        g.fillStyle(0x1e293b);
        g.fillRect(-10, 6, 20, 12);
        g.fillStyle(0x0f172a);
        g.fillRoundedRect(-12, 16, 24, 6, 2);
        
        // Handle (Extending outward)
        g.lineStyle(5, 0x111827);
        g.beginPath(); g.moveTo(10, 18); g.lineTo(28, 22); g.strokePath();

        // Coffee drips (During Recover or Dash)
        if ((isRecover && this.animFrame % 15 < 7) || isDashing) {
            g.fillStyle(0x3e1804);
            g.fillEllipse(-4, 25 + (this.animFrame % 8), 2, 4);
            g.fillEllipse(4, 23 + (this.animFrame % 6), 2, 4);
        }

        // 6. Pressure gauge (Ultra sharp)
        g.fillStyle(0xffffff);
        g.fillCircle(-8, 5, 8);
        g.lineStyle(1, 0x475569);
        g.strokeCircle(-8, 5, 8);
        
        // Tick marks (Degree markers)
        g.lineStyle(1, 0x000000);
        for(let i=0; i<5; i++) {
            const ang = -Math.PI + (Math.PI/4) * i;
            g.beginPath();
            g.moveTo(-8 + Math.cos(ang)*5, 5 + Math.sin(ang)*5);
            g.lineTo(-8 + Math.cos(ang)*7, 5 + Math.sin(ang)*7);
            g.strokePath();
        }

        // Gauge needle (Red)
        g.save();
        g.translateCanvas(-8, 5);
        g.rotateCanvas(this.gaugeNeedleAngle);
        g.lineStyle(2, 0xff0000);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(4, 4); g.strokePath();
        g.fillCircle(0, 0, 2);
        g.restore();

        // 7. Steam wand (Milk frother) pointing left
        g.lineStyle(4, 0x94a3b8);
        g.beginPath(); g.moveTo(-16, 12); g.lineTo(-28, 22); g.strokePath();
        g.lineStyle(5, 0x1e293b);
        g.beginPath(); g.moveTo(-20, 15); g.lineTo(-24, 18); g.strokePath();

        // Blinking red warning light when charging
        if (this.engineGlow > 0) {
            g.fillStyle(0xff0000, this.engineGlow * Math.abs(Math.sin(this.animFrame*0.2)));
            g.fillCircle(12, 5, 4);
        }
    }
}
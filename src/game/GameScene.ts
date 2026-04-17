import Phaser from "phaser";
import { Player } from "./Player";
import { GAME_CONFIG } from "./Constants";
import { BaseEnemy } from "./BaseEnemy";
import { Microwave } from "./NormalEnemies/Microwave";
import { Roomba } from "./NormalEnemies/Roomba";
import { RiceCooker } from "./NormalEnemies/RiceCooker";
import { ToastBullet } from "./Weapons/ToastBullet";
import { WashingMachine } from "./Bosses/WashingMachine";
import { EspressoMachine } from "./Bosses/EspressoMachine";
import { DamageNumber } from './DamageNumber';

// ──────────────────────────────────────────────
// TOASTER SURVIVORS: Breakfast Protocol
// ──────────────────────────────────────────────

// Upgrade definitions
interface Upgrade {
    key: string;
    label: string;
    description: string;
    apply: (scene: GameScene) => void;
    canApply: (scene: GameScene) => boolean;
}

const UPGRADES: Upgrade[] = [
    {
        key: "maxhp",
        label: "+Max HP",
        description: "+20 Integrity",
        apply: (s) => {
            s.maxHp += 20;
            s.hp = Math.min(s.hp + 20, s.maxHp);
        },
        canApply: () => true,
    },
    {
        key: "speed",
        label: "+Move Speed",
        description: "+30 Speed",
        apply: (s) => {
            s.playerSpeed += 30;
        },
        canApply: () => true,
    },
    {
        key: "pickup",
        label: "+Pickup Radius",
        description: "+20 Pickup",
        apply: (s) => {
            s.pickupRadius += 20;
        },
        canApply: () => true,
    },
    {
        key: "toastlvl",
        label: "Burnt Toast Level+",
        description: "+2 damage, -0.05s cooldown",
        apply: (s) => {
            s.toastLevel++;
            s.toastDmg += 2;
            s.toastCooldown = Math.max(0.15, s.toastCooldown - 0.05);
        },
        canApply: (s) => s.toastLevel < 10,
    },
];

export default class GameScene extends Phaser.Scene {
    // Player stats
    hp = 100;
    maxHp = 100;
    playerSpeed = 200;
    pickupRadius = 80;
    toastLevel = 1;
    toastDmg = 15;
    toastCooldown = 0.6;

    // XP / leveling
    xp = 0;
    xpToNext = 10;
    level = 1;

    // Spawn
    spawnTimer = 0;
    elapsed = 0;

    // Weapon timer
    weaponTimer = 0;

    // Game state
    gameOver = false;
    paused = false;
    iFrameTimer = 0;

    // Game objects
    player!: Player;
    enemies!: Phaser.Physics.Arcade.Group;
    bullets!: Phaser.Physics.Arcade.Group;
    orbs!: Phaser.Physics.Arcade.Group;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };

    // UI
    hpText!: Phaser.GameObjects.Text;
    hpBar!: Phaser.GameObjects.Graphics;
    xpBar!: Phaser.GameObjects.Graphics;
    timerText!: Phaser.GameObjects.Text;
    levelText!: Phaser.GameObjects.Text;
    gameOverText!: Phaser.GameObjects.Text;
    levelUpContainer!: Phaser.GameObjects.Container;

    // UI NEW: Boss Health Bar
    currentBoss: BaseEnemy | null = null;
    bossHpBarBg!: Phaser.GameObjects.Graphics;
    bossHpBarFill!: Phaser.GameObjects.Graphics;
    bossNameText!: Phaser.GameObjects.Text;

    // Floor
    floor!: Phaser.GameObjects.TileSprite;

    constructor() {
        super({ key: "GameScene" });
    }

    preload() {
        this.createTextures();
    }

    createTextures() {
        const g = this.make.graphics({ x: 0, y: 0 });

        // Player: Toaster (32x32)
        g.clear();
        g.fillStyle(0xc0c0c0);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(0x808080);
        g.fillRect(4, 2, 10, 14);
        g.fillRect(18, 2, 10, 14);
        g.fillStyle(0xff6600);
        g.fillRect(6, 4, 6, 8);
        g.fillRect(20, 4, 6, 8);
        g.fillStyle(0x333333);
        g.fillRect(14, 18, 4, 12);
        g.generateTexture("toaster", 32, 32);

        // Bullet: Burnt Toast (28x28)
        g.clear();
        g.fillStyle(0x000000, 0.3);
        g.fillRoundedRect(2, 4, 24, 24, 6);
        g.fillStyle(0x78350f);
        g.fillRoundedRect(0, 0, 24, 24, 6);
        g.fillStyle(0xfef08a);
        g.fillRoundedRect(2, 2, 20, 20, 4);
        g.fillStyle(0xc2410c, 0.3);
        g.fillCircle(12, 12, 10);
        g.fillStyle(0x9a3412, 0.5);
        g.fillCircle(12, 12, 6);
        g.fillStyle(0x431407, 0.6);
        g.fillCircle(12, 12, 2.5);
        g.fillStyle(0xd97706, 0.6);
        g.fillCircle(6, 6, 1);
        g.fillCircle(18, 5, 1.5);
        g.fillCircle(5, 18, 1);
        g.fillCircle(19, 19, 1);
        g.fillCircle(8, 16, 0.5);
        g.fillCircle(16, 11, 1);
        g.fillCircle(8, 8, 1);
        g.lineStyle(1.5, 0xffffff, 0.5);
        g.beginPath();
        g.moveTo(4, 2);
        g.lineTo(20, 2);
        g.strokePath();
        g.generateTexture("toast", 28, 28);

        // XP Orb: Screw
        g.clear();
        g.fillStyle(0x94a3b8);
        g.fillCircle(7, 7, 7);
        g.fillStyle(0x334155);
        g.fillRect(3, 6, 8, 2);
        g.fillRect(6, 3, 2, 8);
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(5, 4, 2);
        g.generateTexture("screw", 14, 14);

        // Floor tile (64x64)
        g.clear();
        g.fillStyle(0xf5e6c8);
        g.fillRect(0, 0, 64, 64);
        g.lineStyle(1, 0xe0d0b0);
        g.strokeRect(0, 0, 64, 64);
        g.strokeRect(0, 0, 32, 32);
        g.generateTexture("floor", 64, 64);

        g.destroy();
    }

    create() {
        this.hp = 100;
        this.maxHp = 100;
        this.playerSpeed = 200;
        this.pickupRadius = 80;
        this.toastLevel = 1;
        this.toastDmg = 15;
        this.toastCooldown = 0.6;
        this.xp = 0;
        this.xpToNext = 10;
        this.level = 1;
        this.spawnTimer = 0;
        this.elapsed = 0;
        this.weaponTimer = 0;
        this.gameOver = false;
        this.paused = false;
        this.iFrameTimer = 0;
        this.currentBoss = null;

        this.physics.world.setBounds(
            0,
            0,
            GAME_CONFIG.WORLD_W,
            GAME_CONFIG.WORLD_H,
        );

        this.floor = this.add.tileSprite(
            GAME_CONFIG.WORLD_W / 2,
            GAME_CONFIG.WORLD_H / 2,
            GAME_CONFIG.WORLD_W,
            GAME_CONFIG.WORLD_H,
            "floor",
        );

        this.player = new Player(
            this,
            GAME_CONFIG.WORLD_W / 2,
            GAME_CONFIG.WORLD_H / 2,
        );
        this.player.setDepth(10);

        this.enemies = this.physics.add.group({ runChildUpdate: false });
        this.bullets = this.physics.add.group({ runChildUpdate: true });
        this.orbs = this.physics.add.group({ runChildUpdate: false });

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD_W, GAME_CONFIG.WORLD_H);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasd = {
            W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };

        this.physics.add.overlap(
            this.bullets,
            this.enemies,
            this.onBulletHitEnemy as any,
            undefined,
            this,
        );
        this.physics.add.overlap(
            this.player,
            this.enemies,
            this.onPlayerHitEnemy as any,
            undefined,
            this,
        );
        this.physics.add.overlap(
            this.player,
            this.orbs,
            this.onPickupOrb as any,
            undefined,
            this,
        );

        this.createUI();

        this.input.keyboard!.on("keydown-R", () => {
            if (this.gameOver) this.scene.restart();
        });
    }

    createUI() {
        const width = GAME_CONFIG.CANVAS_WIDTH;
        const height = GAME_CONFIG.CANVAS_HEIGHT;

        this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
        this.xpBar = this.add.graphics().setScrollFactor(0).setDepth(100);

        this.hpText = this.add
            .text(16, 16, "", {
                fontSize: "14px",
                color: "#ffffff",
                fontFamily: "monospace",
                stroke: "#000000",
                strokeThickness: 3,
            })
            .setScrollFactor(0)
            .setDepth(101);

        this.timerText = this.add
            .text(width - 16, 16, "00:00", {
                fontSize: "16px",
                color: "#ffffff",
                fontFamily: "monospace",
                stroke: "#000000",
                strokeThickness: 3,
            })
            .setScrollFactor(0)
            .setDepth(101)
            .setOrigin(1, 0);

        this.levelText = this.add
            .text(width / 2, 16, "Lv.1", {
                fontSize: "14px",
                color: "#ffdd00",
                fontFamily: "monospace",
                stroke: "#000000",
                strokeThickness: 3,
            })
            .setScrollFactor(0)
            .setDepth(101)
            .setOrigin(0.5, 0);

        // --- UI Boss: Large Health Bar in Center of Screen ---
        this.bossHpBarBg = this.add.graphics().setScrollFactor(0).setDepth(150).setVisible(false);
        this.bossHpBarFill = this.add.graphics().setScrollFactor(0).setDepth(151).setVisible(false);
        this.bossNameText = this.add.text(width / 2, 40, "", { 
                fontSize: "20px", color: "#ff4444", fontFamily: "monospace", fontStyle: "bold",
                stroke: "#000000", strokeThickness: 4, shadow: { color: '#ff0000', blur: 5, fill: true }
        }).setScrollFactor(0).setDepth(152).setOrigin(0.5, 0).setVisible(false);

        this.gameOverText = this.add
            .text(width / 2, height / 2, "", {
                fontSize: "32px",
                color: "#ff4444",
                fontFamily: "monospace",
                stroke: "#000000",
                strokeThickness: 4,
                align: "center",
            })
            .setScrollFactor(0)
            .setDepth(200)
            .setOrigin(0.5);

        this.levelUpContainer = this.add
            .container(0, 0)
            .setScrollFactor(0)
            .setDepth(200)
            .setVisible(false);
    }

    // --- FUNCTION CALLED FROM BOSS ON SPAWN ---
    public registerBoss(boss: BaseEnemy, name: string) {
            this.currentBoss = boss;
            this.bossNameText.setText(name);
            this.bossNameText.setVisible(true);
            this.bossHpBarBg.setVisible(true);
            this.bossHpBarFill.setVisible(true);
            this.cameras.main.flash(300, 255, 0, 0); // Red flash warning
    }

    // --- FUNCTION CALLED FROM BOSS ON DEATH ---
    public clearBoss() {
            this.currentBoss = null;
            this.bossNameText.setVisible(false);
            this.bossHpBarBg.setVisible(false);
            this.bossHpBarFill.setVisible(false);
    }

    update(_time: number, delta: number) {
        if (this.gameOver || this.paused) return;

        const dt = delta / 1000;
        this.elapsed += dt;

        // Move Player
        this.movePlayer();
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        this.player.update(body.velocity.x, body.velocity.y);

        this.spawnTimer += dt;
        if (this.spawnTimer >= Math.max(0.4, 1.5 - this.elapsed * 0.01)) {
            this.spawnTimer = 0;
            this.spawnEnemy();
        }

        this.enemies.getChildren().forEach((e: any) => {
            if (e.active && e.update) e.update(_time, delta);
        });

        // Fire bullets
        this.weaponTimer += dt;
        if (this.weaponTimer >= this.toastCooldown) {
            this.weaponTimer = 0;
            this.fireToast(); // Will auto-target nearest enemy
        }

        this.bullets.getChildren().forEach((b) => {
            const bullet = b as Phaser.Physics.Arcade.Sprite;
            if (!bullet.active) return;
            const cam = this.cameras.main;
            if (
                bullet.x < cam.scrollX - 100 ||
                bullet.x > cam.scrollX + cam.width + 100 ||
                bullet.y < cam.scrollY - 100 ||
                bullet.y > cam.scrollY + cam.height + 100
            ) {
                bullet.destroy();
            }
        });

        if (this.iFrameTimer > 0) this.iFrameTimer -= dt;

        this.orbs.getChildren().forEach((o) => {
            const orb = o as Phaser.Physics.Arcade.Sprite;
            if (!orb.active) return;
            const dist = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                orb.x,
                orb.y,
            );
            if (dist < this.pickupRadius) {
                this.physics.moveToObject(orb, this.player, 300);
            }
        });

        this.updateUI();
    }

    movePlayer() {
        let vx = 0,
            vy = 0;
        if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
        if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
        if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;

        const len = Math.sqrt(vx * vx + vy * vy) || 1;
        const speed = this.playerSpeed;
        this.player.setVelocity((vx / len) * speed, (vy / len) * speed);
    }

    spawnEnemy() {
        const angle = Math.random() * Math.PI * 2;
        const x = this.player.x + Math.cos(angle) * 550;
        const y = this.player.y + Math.sin(angle) * 550;

        const r = Math.random();
        let enemy: any;

        // --- BOSS SPAWN LOGIC ---
        if (this.elapsed > 60 && Math.random() < 0.1) {
                enemy = new WashingMachine(this, x, y, 1500, 70, 20);
        } 
        else if (this.elapsed > 120 && Math.random() < 0.05 && !this.currentBoss) {
                enemy = new EspressoMachine(this, x, y, 1200, 150, 15);
        }
        // --- NORMAL ENEMY TYPES ---
        else if (r < 0.2) {
            enemy = new Microwave(this, x, y, 40, 150, 0);
        } else if (r < 0.3) {
            enemy = new Roomba(this, x, y, 25, 110, 2);
        } else if (r < 0.4) {
            enemy = new RiceCooker(this, x, y, 180, 60, 10);
        } else {
            enemy = new BaseEnemy(this, x, y, 15, 100, 5);
        }

        this.enemies.add(enemy);
    }

    public takePlayerDamage(amount: number) {
        this.onPlayerHitEnemy(this.player, amount);
    }

    public spawnXpOrb(x: number, y: number) {
        const orb = this.physics.add.sprite(x, y, "screw");
        orb.setData("xp", 1);
        this.orbs.add(orb);
    }

    fireToast() {
        let nearest: Phaser.Physics.Arcade.Sprite | null = null;
        let nearDist = Infinity;
        this.enemies.getChildren().forEach((e) => {
            const enemy = e as Phaser.Physics.Arcade.Sprite;
            if (!enemy.active) return;
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (d < nearDist) { 
                nearDist = d; 
                nearest = enemy; 
            }
        });

        if (!nearest) return;

        if (this.player.playAttackAnim) {
                this.player.playAttackAnim();
        }

        const bullet = new ToastBullet(
            this,
            this.player.x,
            this.player.y,
            this.toastDmg,
        );
        this.bullets.add(bullet);

        const angle = Phaser.Math.Angle.Between(
            this.player.x,
            this.player.y,
            nearest.x,
            nearest.y,
        );

        const bulletSpeed = 500;
        bullet.setVelocity(
            Math.cos(angle) * bulletSpeed,
            Math.sin(angle) * bulletSpeed,
        );

        this.time.delayedCall(2500, () => {
            if (bullet.active) bullet.destroy();
        });
    }

  onBulletHitEnemy(bullet: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
    const dmg = bullet.getData("dmg") as number;
    let ehp = enemy.getData("hp") as number;
    ehp -= dmg;
    bullet.destroy();

    if (ehp <= 0) {
      // Drop XP orb
      const orb = this.physics.add.sprite(enemy.x, enemy.y, "screw");
      orb.setData("xp", 1);
      this.orbs.add(orb);
      // Re-add overlap for new orb
      this.physics.add.overlap(this.player, orb, this.onPickupOrb as any, undefined, this);
      enemy.destroy();
    } else {
      enemy.setData("hp", ehp);
      // Flash white
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(80, () => { if (enemy.active) enemy.clearTint(); });
    }
  }

  onPlayerHitEnemy(_player: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
    if (this.iFrameTimer > 0) return;
    
    const dmg = (enemy.getData("dmg") as number) || 5;
    this.hp -= dmg;
    this.iFrameTimer = 0.5; // 0.5s invincibility

        this.cameras.main.shake(100, 0.01);
        this.player.setAlpha(0.5);
        this.time.delayedCall(100, () => this.player.setAlpha(1));

        if (this.hp <= 0) this.doGameOver();
    }

    onPickupOrb(
        _player: Phaser.Physics.Arcade.Sprite,
        orb: Phaser.Physics.Arcade.Sprite,
    ) {
        const xpVal = (orb.getData("xp") as number) || 1;
        this.xp += xpVal;
        orb.destroy();

        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(this.xpToNext * 1.5);
            this.showLevelUp();
        }
    }

    showLevelUp() {
        this.paused = true;
        this.physics.pause();

        const available = UPGRADES.filter((u) => u.canApply(this));
        const picks: Upgrade[] = [];
        const pool = [...available];
        while (picks.length < 3 && pool.length > 0) {
            const idx = Math.floor(Math.random() * pool.length);
            picks.push(pool.splice(idx, 1)[0]);
        }

        this.levelUpContainer.removeAll(true);
        const cam = this.cameras.main;
        const cx = cam.width / 2;
        const cy = cam.height / 2;

        const overlay = this.add.graphics().setScrollFactor(0);
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, cam.width, cam.height);
        this.levelUpContainer.add(overlay);

        const title = this.add
            .text(cx, cy - 120, `LEVEL UP! (Lv.${this.level})`, {
                fontSize: "24px",
                color: "#ffdd00",
                fontFamily: "monospace",
                stroke: "#000000",
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setScrollFactor(0);
        this.levelUpContainer.add(title);

        picks.forEach((upgrade, i) => {
            const by = cy - 40 + i * 70;
            const bg = this.add.graphics().setScrollFactor(0);
            bg.fillStyle(0x444444, 0.9);
            bg.fillRoundedRect(cx - 140, by - 20, 280, 55, 8);
            bg.lineStyle(2, 0xffdd00);
            bg.strokeRoundedRect(cx - 140, by - 20, 280, 55, 8);
            this.levelUpContainer.add(bg);

            const txt = this.add
                .text(cx, by, `${upgrade.label}\n${upgrade.description}`, {
                    fontSize: "14px",
                    color: "#ffffff",
                    fontFamily: "monospace",
                    align: "center",
                })
                .setOrigin(0.5, 0)
                .setScrollFactor(0);
            this.levelUpContainer.add(txt);

            const zone = this.add
                .zone(cx, by + 10, 280, 55)
                .setScrollFactor(0)
                .setInteractive({ useHandCursor: true });
            zone.on("pointerover", () =>
                bg
                    .clear()
                    .fillStyle(0x666600, 0.9)
                    .fillRoundedRect(cx - 140, by - 20, 280, 55, 8)
                    .lineStyle(2, 0xffdd00)
                    .strokeRoundedRect(cx - 140, by - 20, 280, 55, 8),
            );
            zone.on("pointerout", () =>
                bg
                    .clear()
                    .fillStyle(0x444444, 0.9)
                    .fillRoundedRect(cx - 140, by - 20, 280, 55, 8)
                    .lineStyle(2, 0xffdd00)
                    .strokeRoundedRect(cx - 140, by - 20, 280, 55, 8),
            );
            zone.on("pointerdown", () => {
                upgrade.apply(this);
                this.hideLevelUp();
            });
            this.levelUpContainer.add(zone);
        });

        this.levelUpContainer.setVisible(true);
    }

    hideLevelUp() {
        this.levelUpContainer.setVisible(false);
        this.levelUpContainer.removeAll(true);
        this.paused = false;
        this.physics.resume();
    }

    doGameOver() {
        this.gameOver = true;
        this.physics.pause();
        const cam = this.cameras.main;
        this.gameOverText.setText("GAME OVER\n\nPress R to restart");
        this.gameOverText.setPosition(cam.width / 2, cam.height / 2);
    }

    updateUI() {
        const width = GAME_CONFIG.CANVAS_WIDTH;
        const height = GAME_CONFIG.CANVAS_HEIGHT;

        this.hpBar.clear();
        this.hpBar.fillStyle(0x333333);
        this.hpBar.fillRect(16, 36, 160, 14);
        this.hpBar.fillStyle(0x44cc44);
        this.hpBar.fillRect(16, 36, 160 * (this.hp / this.maxHp), 14);
        this.hpText.setText(`HP: ${this.hp}/${this.maxHp}`);

        this.xpBar.clear();
        this.xpBar.fillStyle(0x333333);
        this.xpBar.fillRect(0, height - 10, width, 10);
        this.xpBar.fillStyle(0x4488ff);
        this.xpBar.fillRect(0, height - 10, width * (this.xp / this.xpToNext), 10);

        const mins = Math.floor(this.elapsed / 60);
        const secs = Math.floor(this.elapsed % 60);
        this.timerText.setText(
            `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
        );

        this.levelText.setText(`Lv.${this.level}  Toast:${this.toastLevel}`);

        // --- UPDATE BOSS HEALTH BAR ---
        if (this.currentBoss && this.currentBoss.active) {
                const barWidth = 300;
                const barHeight = 16;
                const bx = width / 2 - barWidth / 2;
                const by = 65;
                const percent = Math.max(0, this.currentBoss.hp / this.currentBoss.maxHp);

                this.bossHpBarBg.clear();
                this.bossHpBarBg.fillStyle(0x000000, 0.8);
                this.bossHpBarBg.fillRoundedRect(bx - 4, by - 4, barWidth + 8, barHeight + 8, 4);
                this.bossHpBarBg.lineStyle(2, 0x555555);
                this.bossHpBarBg.strokeRoundedRect(bx - 4, by - 4, barWidth + 8, barHeight + 8, 4);

                this.bossHpBarFill.clear();
                this.bossHpBarFill.fillStyle(0xff2222, 1);
                this.bossHpBarFill.fillRoundedRect(bx, by, barWidth * percent, barHeight, 2);
        }
    }

    public spawnSteamCloud(x: number, y: number) {
        const cloud = this.add.graphics();
        cloud.fillStyle(0xffffff, 0.5);
        cloud.fillCircle(x, y, 150);
        cloud.setDepth(50);

        this.tweens.add({
            targets: cloud,
            alpha: 0,
            scale: 1.5,
            duration: 2000,
            onComplete: () => cloud.destroy(),
        });
    }

    public spawnCoffeePuddle(x: number, y: number) {
        const puddle = this.add.graphics();
        puddle.fillStyle(0x451a03, 0.7);
        puddle.fillCircle(x, y, 20);

        this.time.delayedCall(3000, () => puddle.destroy());

        const dist = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            x,
            y,
        );
        if (dist < 25) {
            this.takePlayerDamage(2);
        }
    }

    public spawnSocks(x: number, y: number) {
        const sock = this.physics.add.sprite(x, y, "toast");
        sock.setTint(0xffffff);
        this.physics.moveToObject(sock, this.player, 250);

        this.time.delayedCall(2000, () => {
            if (sock.active) sock.destroy();
        });
    }
}